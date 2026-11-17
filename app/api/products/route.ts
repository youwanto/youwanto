import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { HOME_FEED_PAGE_SIZE } from "@/lib/constants";

const querySchema = z.object({
  cursor: z.string().uuid().optional(),
  category: z.string().min(1).max(200).optional(), // category path, e.g. "women/outerwear"
  brand: z.string().min(1).max(200).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "name-asc"]).default("newest"),
});

// `id` is the tie-breaker so cursor pagination is stable when values repeat
const ORDER_BY: Record<z.infer<typeof querySchema>["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  "newest": [{ createdAt: "desc" }, { id: "asc" }],
  "price-asc": [{ price: "asc" }, { id: "asc" }],
  "price-desc": [{ price: "desc" }, { id: "asc" }],
  "name-asc": [{ name: "asc" }, { id: "asc" }],
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { cursor, category, brand, minPrice, maxPrice, sort } = parsed.data;

  const price: Prisma.DecimalFilter<"Product"> = {};
  if (minPrice !== undefined) price.gte = minPrice;
  if (maxPrice !== undefined && maxPrice > 0) price.lte = maxPrice;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(category
      ? {
          categories: {
            some: {
              category: { OR: [{ path: category }, { path: { startsWith: `${category}/` } }] },
            },
          },
        }
      : {}),
    ...(brand ? { brand } : {}),
    ...(Object.keys(price).length > 0 ? { price } : {}),
  };

  // Fetch one extra row to know whether another page exists
  const rows = await prisma.product.findMany({
    where,
    orderBy: ORDER_BY[sort],
    take: HOME_FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > HOME_FEED_PAGE_SIZE;
  const items = hasMore ? rows.slice(0, HOME_FEED_PAGE_SIZE) : rows;

  return NextResponse.json({
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
