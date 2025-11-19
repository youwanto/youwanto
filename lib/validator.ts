import { z } from "zod";
import { formatNumberWithDecimal } from "./utils";

const formatPrice = z.string().refine(
  (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),
  "Invalid price format. Must be a number with up to two decimal places."
);

export const insertProductSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  category: z.string().min(3, "Category must be at least 3 characters"),
  brand: z.string().min(3, "Brand must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  stock: z.coerce.number(),
  price: formatPrice,
  currency: z.string().length(3, "Currency must be a 3-letter code"),
  images: z.array(z.string().url("Invalid image URL")).min(1, "At least one image is required"),
  isFeatured: z.boolean().optional(),
  banner: z.string().nullable(),
});

export const signInFormSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Cart item Schemas
export const cartItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Product slug is required"),
  price: formatPrice,
  currency: z.string().length(3, "Currency must be a 3-letter code"),
  quantity: z.number().int().nonnegative("Quantity must be a non-negative integer"),
  image: z.string().min(1, "Image is required"),
});

// Schema for inserting a cart with multiple items
export const insertCartSchema = z.object({
  items: z.array(cartItemSchema),
  itemsPrice: formatPrice,
  taxPrice: formatPrice,
  shippingPrice: formatPrice,
  totalPrice: formatPrice,
  sessionCartId: z.string().min(1, "Session cart ID is required"),
  userId: z.string().optional().nullable(),
});