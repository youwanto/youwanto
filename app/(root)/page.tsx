import { prisma } from "@/db/prisma";
import { Product } from "@/types";
import InfiniteProductList from "@/components/product/infinite-product-list";

const PAGE_SIZE = 12;

const Homepage = async () => {
  const [moreLatestProducts, categoryRows, brandRows, priceAgg] = await Promise.all([
    prisma.product.findMany({
      take: PAGE_SIZE,
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { level: 2 },
      select: { name: true, path: true },
      orderBy: { name: "asc" },
    }),
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
    moreLatestProducts.length > 0
      ? moreLatestProducts[moreLatestProducts.length - 1].id
      : null;
  const categories = categoryRows.map((row) => row.name).filter(Boolean);
  const brands = brandRows.map((row) => row.brand).filter((b): b is string => Boolean(b));
  const priceMin = Number(priceAgg._min.price ?? 0);
  const priceMax = Number(priceAgg._max.price ?? 0);

  return(
    <div className="space-y-8">
      <h2 className="h2-bold">Latest Products</h2>
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
