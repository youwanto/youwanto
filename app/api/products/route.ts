import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import type { Product as ProductType } from "@/types";

const PAGE_SIZE = 12;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  let productsFromDb;

  if (cursor) {
    productsFromDb = await prisma.product.findMany({
      take: PAGE_SIZE,
      skip: 1,
      cursor: { id: cursor },
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  } else {
    productsFromDb = await prisma.product.findMany({
      take: PAGE_SIZE,
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  const items = productsFromDb as ProductType[];
  const nextCursor =
    productsFromDb.length > 0
      ? productsFromDb[productsFromDb.length - 1].id
      : null;

  return NextResponse.json({
    items,
    nextCursor,
  });
}
