'use server';
import { prisma } from "@/db/prisma";
import { LATEST_PRODUCTS_LIMIT } from "../constants";
import { convertToPlainObject } from "../utils";

// get latest products
export async function getLatestProducts() {

    const products = await prisma.product.findMany({
        orderBy: {
            createdAt: "desc"
        },
        take: LATEST_PRODUCTS_LIMIT
    });
    return convertToPlainObject(products);
};


// get single product by slug
export async function getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
        where: { slug },
        include:{
            variants: true,
        }
    });
    return convertToPlainObject(product);
}