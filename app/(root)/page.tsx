import { prisma } from '@/db/prisma';
import { Product } from '@/types';
import InfiniteProductList from '@/components/product/infinite-product-list';
import { buildCatalogQuery, catalogPage } from '@/lib/catalog';
import { convertToPlainObject } from '@/lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const Homepage = async () => {
  const currency = 'GBP';
  const where = { isActive: true, currency };
  const [rows, categoryRows, brandRows, priceAgg] = await Promise.all([
    prisma.product.findMany(buildCatalogQuery({ sort: 'newest', currency })),
    prisma.category.findMany({
      where: { products: { some: { product: where } } },
      select: { name: true, path: true, level: true },
      orderBy: { path: 'asc' },
    }),
    prisma.product.findMany({ where, distinct: ['brand'], select: { brand: true }, orderBy: { brand: 'asc' } }),
    prisma.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
  ]);
  // Include ancestors of directly assigned categories; feeds may link only leaf nodes.
  const paths = new Set(categoryRows.flatMap(({ path }) => {
    const parts = path.split('/');
    return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
  }));
  const categories = await prisma.category.findMany({
    where: { level: 2, path: { in: [...paths] } },
    select: { name: true, path: true }, orderBy: [{ name: 'asc' }, { path: 'asc' }],
  });
  const { items, nextCursor } = catalogPage(rows);
  return (
    <div className="space-y-8">
      <h1 className="h2-bold">Latest Products</h1>
      <InfiniteProductList
        initialProducts={convertToPlainObject(items) as unknown as Product[]}
        initialCursor={nextCursor}
        categories={categories.map(({ name, path }) => ({ value: path, label: `${path.split('/')[0]} / ${name}` }))}
        brands={brandRows.map(row => row.brand).filter((brand): brand is string => Boolean(brand))}
        priceRange={{ min: Number(priceAgg._min.price ?? 0), max: Number(priceAgg._max.price ?? 0) }}
        currency={currency}
      />
    </div>
  );
};
export default Homepage;
