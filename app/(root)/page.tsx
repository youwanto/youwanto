import { prisma } from "@/db/prisma";
import { Product } from "@/types";
import InfiniteProductList from "@/components/product/infinite-product-list";

const PAGE_SIZE = 12;

const Homepage = async () => {
  const moreLatestProducts = await prisma.product.findMany(
    {
      take: PAGE_SIZE,
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }
  );
  // Cast DB objects to your app-level Product type
  const latestProducts = moreLatestProducts as Product[];

  const nextCursor =
    moreLatestProducts.length > 0
      ? moreLatestProducts[moreLatestProducts.length - 1].id
      : null;
  return(
    <div className="space-y-8">
      <h2 className="h2-bold">Latest Products</h2>
      <InfiniteProductList initialProducts={latestProducts} initialCursor={nextCursor} />
    </div>
  );
};

export default Homepage;

