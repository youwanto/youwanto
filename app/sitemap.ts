import type { MetadataRoute } from 'next';
import { prisma } from '@/db/prisma';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 3600;

// A single sitemap file may hold at most 50,000 URLs
const MAX_PRODUCT_URLS = 45000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      select: { path: true, updatedAt: true },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_PRODUCT_URLS,
    }),
  ]);

  return [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    ...categories.map((category) => ({
      url: absoluteUrl(`/${category.path}`),
      lastModified: category.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/products/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
