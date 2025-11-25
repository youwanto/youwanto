'use server';
import { CartItem } from "@/types";
import { convertToPlainObject, formatError } from "../utils";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { get } from "http";
import { cartItemSchema } from "../validator";

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
        // Test
        // console.log({
        //     'Session Cart ID': sessionCartId,
        //     'User ID': userId,
        //     'Cart': cart,
        //     'Item': item,
        //     'Product': product,
        // });
        return {
            success: true,
            message: "Item added to cart successfully",
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