'use server';
import { CartItem } from "@/types";
import { convertToPlainObject, formatError, roundToTwoDecimals } from "../utils";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { cartItemSchema, insertCartSchema } from "../validator";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// Calculate cart prices
const calcPrice = (items: CartItem[]) => {
    const itemsPrice = roundToTwoDecimals(
        items.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0)
    );
    const shippingPrice = roundToTwoDecimals(itemsPrice > 100 ? 0 : 10);
    const taxPrice = roundToTwoDecimals(0.15 * itemsPrice);
    const totalPrice = roundToTwoDecimals(itemsPrice + shippingPrice + taxPrice);
    
    return {
        itemsPrice: itemsPrice.toFixed(2),
        shippingPrice: shippingPrice.toFixed(2),
        taxPrice: taxPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
    }
};

// Add item to cart in database
export async function addItemToCart(data: CartItem) {
    try {
        // Check for session cart cookie
        const sessionCartId = (await cookies()).get('sessionCartId')?.value;
        if (!sessionCartId) throw new Error("No session cart ID found.");

        // Get session and user ID
        const session = await auth();
        const userId = session?.user?.id ? (session.user.id as string) : undefined;
        
        // Get cart from database
        const cart = await getMyCart();

        // Parse and validate item data
        const item = cartItemSchema.parse(data);

        // Find product in database
        const product = await prisma.product.findFirst({
            where: { id: item.productId },
        });
        if (!product) throw new Error("Product not found.");
        if (!cart) {
            // Create new cart if none exists
            const newCart = insertCartSchema.parse({
                userId: userId,
                items: [item],
                sessionCartId: sessionCartId,
                ...calcPrice([item]),
            });
            
            // Add to database
            await prisma.cart.create({
                data: newCart,
            });

            // revalidate product page
            revalidatePath(`/product/${product.slug}`);
            revalidatePath(`/products/${product.slug}`);
            return {
                success: true,
                message: `${product.name} added to cart successfully`,
            };

        } else {
            // Check if item already exists in cart
            const existItem = (cart.items as CartItem[]).find(
                (x) => x.productId === item.productId
            );

            // if not enough stock, throw error
            if (existItem) {
                if (!product.isActive) {
                    throw new Error("Product is no longer available.");
                }
                // increase quantity of existing item
                (cart.items as CartItem[]).find(
                    (x) => x.productId === item.productId
                )!.quantity = existItem.quantity + 1;
            } else {
                // if stock, add item to cart
                if (!product.isActive) throw new Error("Product is no longer available.");
                cart.items.push(item);
            }
            
            // Save to database
            await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    items: cart.items as Prisma.CartUpdateInput['items'],
                    ...calcPrice(cart.items as CartItem[]),
                },
            });

            revalidatePath(`/product/${product.slug}`);
            revalidatePath(`/products/${product.slug}`);
            return {
                success: true,
                message: `${product.name} ${existItem ? "updated in" : "added to"} cart successfully`,
            };
        }
        // Test
        // console.log({
        //     'Session Cart ID': sessionCartId,
        //     'User ID': userId,
        //     'Cart': cart,
        //     'Item': item,
        //     'Product': product,
        // });

    } catch (error) {
        return {
            success: false,
            message: formatError(error),
        };
    }
};

export async function removeItemFromCart(productId: string) {
    try {
        // Get session cart id
        const sessionCartId = (await cookies()).get('sessionCartId')?.value;
        if (!sessionCartId) throw new Error("No session cart ID found.");

        // Get product
        const product = await prisma.product.findFirst({
            where: { id: productId },
        });
        if (!product) throw new Error("Product not found.");

        // Get cart
        const cart = await getMyCart();
        if (!cart) throw new Error("No cart found.");

        // Check if cart has items
        const existItem = (cart.items as CartItem[]).find(
            (x) => x.productId === productId
        );
        if (!existItem) throw new Error("Item not found in cart.");
        
        // Check if cart has only one item
        if (existItem.quantity === 1) {
            // Remove item from cart
            cart.items = (cart.items as CartItem[]).filter(
                (x) => x.productId !== existItem.productId
            );
        } else {
            // Decrease quantity of item
            (cart.items as CartItem[]).find(
                (x) => x.productId === existItem.productId
            )!.quantity = existItem.quantity - 1;
        }

        // Update cart in database
        await prisma.cart.update({
            where: { id: cart.id },
            data: {
                items: cart.items as Prisma.CartUpdateInput['items'],
                ...calcPrice(cart.items as CartItem[]),
            },
        });
        revalidatePath(`/product/${product.slug}`);
        revalidatePath(`/products/${product.slug}`);
        return {
            success: true,
            message: `${product.name} ${existItem.quantity === 1 ? "removed from" : "updated in"} cart successfully`,
        };
    } catch (error) {
        return {
            success: false,
            message: formatError(error),
        };
    }
};

export async function removeItemCompletely(productId: string) {
    try {
        // Get session cart id
        const sessionCartId = (await cookies()).get('sessionCartId')?.value;
        if (!sessionCartId) throw new Error("No session cart ID found.");

        // Get product
        const product = await prisma.product.findFirst({
            where: { id: productId },
        });
        if (!product) throw new Error("Product not found.");

        // Get cart
        const cart = await getMyCart();
        if (!cart) throw new Error("No cart found.");

        // Check if cart has items
        const existItem = (cart.items as CartItem[]).find(
            (x) => x.productId === productId
        );
        if (!existItem) throw new Error("Item not found in cart.");

        cart.items = (cart.items as CartItem[]).filter(
            (x) => x.productId !== existItem.productId
        );

        // Update cart in database
        await prisma.cart.update({
            where: { id: cart.id },
            data: {
                items: cart.items as Prisma.CartUpdateInput['items'],
                ...calcPrice(cart.items as CartItem[]),
            },
        });
        revalidatePath(`/product/${product.slug}`);
        revalidatePath(`/cart`);
        return {
            success: true,
            message: `${product.name} removed from cart successfully`,
        };
    } catch (error) {
        return {
            success: false,
            message: formatError(error),
        };
    }
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
        where: userId ? { userId: userId } : { sessionCartId: sessionCartId },
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
