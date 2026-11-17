'use server';
import { CartItem } from "@/types";
import { convertToPlainObject, formatError, roundToTwoDecimals } from "../utils";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { addToCartSchema, cartItemSchema, insertCartSchema } from "../validator";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_PRICE, TAX_RATE } from "../constants";

type CartLineKey = { productId: string; variantId?: string | null };

// A cart line is one product + one variant (size/colour)
const isSameLine = (item: CartItem, key: CartLineKey) =>
    item.productId === key.productId && (item.variantId ?? null) === (key.variantId ?? null);

// Calculate cart prices
const calcPrice = (items: CartItem[]) => {
    const itemsPrice = roundToTwoDecimals(
        items.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0)
    );
    const shippingPrice = roundToTwoDecimals(
        items.length === 0 || itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICE
    );
    const taxPrice = roundToTwoDecimals(TAX_RATE * itemsPrice);
    const totalPrice = roundToTwoDecimals(itemsPrice + shippingPrice + taxPrice);

    return {
        itemsPrice: itemsPrice.toFixed(2),
        shippingPrice: shippingPrice.toFixed(2),
        taxPrice: taxPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
    }
};

const revalidateCartPaths = (slug: string) => {
    revalidatePath(`/products/${slug}`);
    revalidatePath(`/cart`);
};

// Build a cart line from the database. Price, name and image never come from the client.
async function buildCartItem(key: CartLineKey): Promise<{ item: CartItem; stockQty: number | null }> {
    const product = await prisma.product.findUnique({
        where: { id: key.productId },
        include: { variants: { where: { isActive: true } } },
    });
    if (!product || !product.isActive) throw new Error("Product is no longer available.");

    const productImage = product.imageUrl ?? product.images[0] ?? '/images/logo.svg';

    if (!key.variantId) {
        if (product.variants.length > 0) throw new Error("Please select an option first.");
        return {
            stockQty: null,
            item: cartItemSchema.parse({
                productId: product.id,
                variantId: null,
                name: product.name,
                slug: product.slug,
                price: Number(product.price).toFixed(2),
                currency: product.currency,
                quantity: 1,
                image: productImage,
            }),
        };
    }

    const variant = product.variants.find((v) => v.id === key.variantId);
    if (!variant) throw new Error("This option is no longer available.");
    if (!variant.inStock) throw new Error("This option is out of stock.");

    return {
        stockQty: variant.stockQty,
        item: cartItemSchema.parse({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            slug: product.slug,
            price: Number(variant.price).toFixed(2),
            currency: variant.currency || product.currency,
            quantity: 1,
            image: variant.imageUrl ?? variant.images[0] ?? productImage,
            size: variant.size,
            color: variant.color,
        }),
    };
}

// Add one unit of a product/variant to the cart
export async function addItemToCart(data: CartLineKey) {
    try {
        const sessionCartId = (await cookies()).get('sessionCartId')?.value;
        if (!sessionCartId) throw new Error("No session cart ID found.");

        const session = await auth();
        const userId = session?.user?.id ? (session.user.id as string) : undefined;

        const key = addToCartSchema.parse(data);
        const { item, stockQty } = await buildCartItem(key);
        const cart = await getMyCart();

        if (!cart) {
            const newCart = insertCartSchema.parse({
                userId: userId,
                items: [item],
                sessionCartId: sessionCartId,
                ...calcPrice([item]),
            });
            await prisma.cart.create({ data: newCart });

            revalidateCartPaths(item.slug);
            return { success: true, message: `${item.name} added to cart successfully` };
        }

        const items = cart.items as CartItem[];
        const existItem = items.find((x) => isSameLine(x, key));
        const nextQuantity = (existItem?.quantity ?? 0) + 1;

        if (stockQty !== null && stockQty > 0 && nextQuantity > stockQty) {
            throw new Error(`Only ${stockQty} left in stock.`);
        }

        // Always refresh the stored line from the database so price changes are picked up
        const nextItems = existItem
            ? items.map((x) => (isSameLine(x, key) ? { ...item, quantity: nextQuantity } : x))
            : [...items, item];

        await prisma.cart.update({
            where: { id: cart.id },
            data: {
                items: nextItems as Prisma.CartUpdateInput['items'],
                ...calcPrice(nextItems),
            },
        });

        revalidateCartPaths(item.slug);
        return {
            success: true,
            message: `${item.name} ${existItem ? "updated in" : "added to"} cart successfully`,
        };
    } catch (error) {
        return {
            success: false,
            message: formatError(error),
        };
    }
};

// Shared implementation for decreasing / removing a cart line
async function updateCartLine(data: CartLineKey, mode: 'decrement' | 'remove') {
    try {
        const key = addToCartSchema.parse(data);
        const cart = await getMyCart();
        if (!cart) throw new Error("No cart found.");

        const items = cart.items as CartItem[];
        const existItem = items.find((x) => isSameLine(x, key));
        if (!existItem) throw new Error("Item not found in cart.");

        const removed = mode === 'remove' || existItem.quantity <= 1;
        const nextItems = removed
            ? items.filter((x) => !isSameLine(x, key))
            : items.map((x) => (isSameLine(x, key) ? { ...x, quantity: x.quantity - 1 } : x));

        await prisma.cart.update({
            where: { id: cart.id },
            data: {
                items: nextItems as Prisma.CartUpdateInput['items'],
                ...calcPrice(nextItems),
            },
        });

        revalidateCartPaths(existItem.slug);
        return {
            success: true,
            message: `${existItem.name} ${removed ? "removed from" : "updated in"} cart successfully`,
        };
    } catch (error) {
        return {
            success: false,
            message: formatError(error),
        };
    }
}

// Decrease quantity by one (removes the line at quantity 1)
export async function removeItemFromCart(productId: string, variantId?: string | null) {
    return updateCartLine({ productId, variantId }, 'decrement');
};

// Remove the whole line regardless of quantity
export async function removeItemCompletely(productId: string, variantId?: string | null) {
    return updateCartLine({ productId, variantId }, 'remove');
};

// Get current user's cart from database
export async function getMyCart() {
    // Check for session cart cookie
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;
    if (!sessionCartId) return undefined;

    // Get session and user ID
    const session = await auth();
    const userId = session?.user?.id;

    // Get user cart from database
    const cart = await prisma.cart.findFirst({
        where: userId ? { userId: userId } : { sessionCartId: sessionCartId, userId: null },
    });

    if (!cart) return undefined;

    // Convert Decimal fields to string
    return convertToPlainObject({
        ...cart,
        items: cart.items as CartItem[],
        itemsPrice: cart.itemsPrice.toString(),
        totalPrice: cart.totalPrice.toString(),
        shippingPrice: cart.shippingPrice.toString(),
        taxPrice: cart.taxPrice.toString(),
    });
};
