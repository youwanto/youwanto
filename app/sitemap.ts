import type { MetadataRoute } from 'next';
import { prisma } from '@/db/prisma';
import { SERVER_URL } from '@/lib/constants';

// Query the catalog at request time; builds do not need sitemap database access.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, orderBy: { id: 'asc' }, take: 45000 }),
    prisma.category.findMany({ where: { products: { some: { product: { isActive: true } } } }, select: { path: true, updatedAt: true }, orderBy: { path: 'asc' }, take: 1000 }),
  ]);
  return [
    { url: new URL('/', SERVER_URL).toString() },
    ...products.map(product => ({ url: new URL(`/products/${encodeURIComponent(product.slug)}`, SERVER_URL).toString(), lastModified: product.updatedAt })),
    ...categories.map(category => ({ url: new URL(`/${category.path}`, SERVER_URL).toString(), lastModified: category.updatedAt })),
  ];
}
