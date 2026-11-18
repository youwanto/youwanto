import type { Metadata } from "next";
import { prisma } from "@/db/prisma";
import { Product } from "@/types";
import { getNonEmptyCategoryPaths } from "@/lib/actions/collection";
import InfiniteProductList from "@/components/product/infinite-product-list";

import { APP_DESCRIPTION, APP_NAME, HOME_FEED_PAGE_SIZE } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME} | Designer fashion from the brands you love` },
  description: APP_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: APP_NAME, description: APP_DESCRIPTION, url: "/" },
};

// The header no longer reads the session on the server, so this page is cached; refresh it hourly
export const revalidate = 3600;

const Homepage = async () => {
  const [moreLatestProducts, categoryRows, nonEmptyPaths, brandRows, priceAgg] = await Promise.all([
    prisma.product.findMany({
      take: HOME_FEED_PAGE_SIZE,
      where: { isActive: true },
      // Must match the default sort of /api/products so the cursor lines up
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.category.findMany({
      where: { level: 2 },
      select: { name: true, path: true },
      orderBy: { name: "asc" },
    }),
    getNonEmptyCategoryPaths(),
    prisma.product.findMany({
      where: { isActive: true },
      distinct: ["brand"],
      select: { brand: true },
      orderBy: { brand: "asc" },
    }),
    prisma.product.aggregate({
      where: { isActive: true },
      _min: { price: true },
      _max: { price: true },
    }),
  ]);
  // Cast DB objects to your app-level Product type
  const latestProducts = moreLatestProducts as Product[];

  const nextCursor =
    moreLatestProducts.length === HOME_FEED_PAGE_SIZE
      ? moreLatestProducts[moreLatestProducts.length - 1].id
      : null;
  // Only offer categories that have something to show
  const categories = categoryRows.filter((row) => row.name && nonEmptyPaths.includes(row.path));
  const brands = brandRows.map((row) => row.brand).filter((b): b is string => Boolean(b));
  const priceMin = Number(priceAgg._min.price ?? 0);
  const priceMax = Number(priceAgg._max.price ?? 0);

  return(
    <div className="space-y-8">
      <h1 className="h2-bold">Latest Products</h1>
      <InfiniteProductList
        initialProducts={latestProducts}
        initialCursor={nextCursor}
        categories={categories}
        brands={brands}
        priceRange={{ min: priceMin, max: priceMax }}
      />
    </div>
  );
};

export default Homepage;
