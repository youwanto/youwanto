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
  const latestProducts: Product[] = moreLatestProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    images: p.images,
    brand: p.brand,
    description: p.description,
    styleCode: p.styleCode,
    stock: p.stock,
    // Prisma Decimal -> number
    price: Number(p.price),
    currency: p.currency,
    rating: Number(p.rating),
    numReviews: p.numReviews,
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    banner: p.banner,
    externalUrl: p.externalUrl,
    // Dates -> string (if your Product type has them; if not, you can omit)
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

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

