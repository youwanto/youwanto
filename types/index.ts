import {z} from "zod";
import { insertCartSchema, insertProductSchema, cartItemSchema, RawProductSchema, productVariantSchema } from "@/lib/validator";

export type Product = z.infer<typeof insertProductSchema> & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    rating: string;
    numReviews: number;
    externalUrl: string;
};

export type Cart = z.infer<typeof insertCartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type RawProductInput = z.infer<typeof RawProductSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;