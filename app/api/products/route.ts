import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";

const NEW_TAKE = 20;   // 70%
const OLD_TAKE = 10;   // 30%

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const category = searchParams.get("category");
  const brand = searchParams.get("brand");
  const minPrice = Number(searchParams.get("minPrice") ?? "0");
  const maxPrice = Number(searchParams.get("maxPrice") ?? "0");
  const sort = searchParams.get("sort") ?? "";

  const priceFilter =
    Number.isFinite(minPrice) && Number.isFinite(maxPrice) && maxPrice > 0
      ? {
          gte: minPrice,
          lte: maxPrice,
        }
      : undefined;

  const baseWhere = {
    isActive: true,
    ...(category
      ? { categories: { some: { category: { path: { startsWith: category } } } } }
      : {}),
    ...(brand ? { brand } : {}),
    ...(priceFilter ? { price: priceFilter } : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { price: "asc" }
      : sort === "price-desc"
      ? { price: "desc" }
      : sort === "name-asc"
      ? { name: "asc" }
      : { createdAt: "desc" };

  // 1. 新数据 → 按 createdAt 降序抓一些
  let newestBatch;

  if (cursor) {
    newestBatch = await prisma.product.findMany({
      take: NEW_TAKE,
      skip: 1,
      cursor: { id: cursor },
      where: baseWhere,
      orderBy,
    });
  } else {
    newestBatch = await prisma.product.findMany({
      take: NEW_TAKE,
      where: baseWhere,
      orderBy,
    });
  }

    // 2. 老数据 → 从更低优先级的 createdAt 区间随机抓一些
  const oldestBatch = await prisma.product.findMany({
    take: OLD_TAKE,
    where: {
      ...baseWhere,
      // 这里我们只抓比最新区块「更老」的商品（安全）
      createdAt: {
        lt: newestBatch[0]?.createdAt,
      },
    },
    orderBy: {
      createdAt: "asc",  // 先按老排
    },
  });

  // 3. 合并
  const combined = [...newestBatch, ...oldestBatch];

  // 4. 洗牌（简单随机）
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  // 5. nextCursor 基于「最新」的 block（分页安全）
  const lastNewest = newestBatch[newestBatch.length - 1];

  return NextResponse.json({
    items: combined,
    nextCursor: lastNewest?.id ?? null,
  });
}
