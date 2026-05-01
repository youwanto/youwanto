'use server';

import { prisma } from '@/db/prisma';
import { collectionQuerySchema } from '@/lib/validator';
import { convertToPlainObject } from '@/lib/utils';
import { Category, Prisma } from '@prisma/client';
import { z } from 'zod';

export type CollectionQuery = z.infer<typeof collectionQuerySchema>;

export type FacetCounts = {
  colors: { value: string; count: number }[];
  sizes: { value: string; count: number }[];
  materials: { value: string; count: number }[];
  brands: { value: string; count: number }[];
  priceRange: { min: number; max: number };
};

export type CollectionProduct = Omit<
  Prisma.ProductGetPayload<{
    include: {
      categories: { include: { category: true } };
      variants: true;
    };
  }>,
  'price' | 'rating' | 'variants'
> & {
  price: string;
  rating: string;
  variants: (Omit<
    Prisma.ProductVariantGetPayload<Record<string, never>>,
    'price' | 'compareAtPrice' | 'discountPct'
  > & {
    price: string;
    compareAtPrice: string | null;
    discountPct: string | null;
  })[];
};

export type CollectionResult = {
  category: Category;
  products: CollectionProduct[];
  facets: FacetCounts;
  breadcrumb: Category[];
  total: number;
  page: number;
  totalPages: number;
};

type FacetRow = { value: string | null; count: bigint | number };
type PriceRangeRow = { min: Prisma.Decimal | string | number | null; max: Prisma.Decimal | string | number | null };

const categoryPathFilter = (path: string): Prisma.CategoryWhereInput => ({
  OR: [{ path }, { path: { startsWith: `${path}/` } }],
});

const toFacetRows = (rows: FacetRow[]) =>
  rows
    .filter((row): row is FacetRow & { value: string } => Boolean(row.value))
    .map((row) => ({ value: row.value, count: Number(row.count) }));

const getVariantPriceWhere = (params: CollectionQuery): Prisma.ProductVariantWhereInput => {
  const price: Prisma.DecimalFilter<'ProductVariant'> = {};

  if (params.minPrice !== undefined) price.gte = params.minPrice;
  if (params.maxPrice !== undefined) price.lte = params.maxPrice;

  return {
    inStock: true,
    ...(Object.keys(price).length > 0 ? { price } : {}),
  };
};

const getProductWhere = (params: CollectionQuery): Prisma.ProductWhereInput => {
  const variantWhere = getVariantPriceWhere(params);
  const hasVariantFilter = params.inStock || params.minPrice !== undefined || params.maxPrice !== undefined;

  return {
    isActive: true,
    categories: {
      some: {
        category: categoryPathFilter(params.path),
      },
    },
    ...(params.colors.length > 0 ? { colors: { hasSome: params.colors } } : {}),
    ...(params.sizes.length > 0 ? { sizes: { hasSome: params.sizes } } : {}),
    ...(params.materials.length > 0 ? { materials: { hasSome: params.materials } } : {}),
    ...(params.brands.length > 0 ? { brand: { in: params.brands } } : {}),
    ...(hasVariantFilter ? { variants: { some: variantWhere } } : {}),
  };
};

const productInclude = (variantWhere: Prisma.ProductVariantWhereInput) => ({
  categories: { include: { category: true } },
  variants: {
    where: variantWhere,
    orderBy: { price: 'asc' as const },
    take: 1,
  },
});

export async function getCategoryByPath(path: string) {
  return prisma.category.findUnique({ where: { path } });
}

export async function getBreadcrumb(path: string): Promise<Category[]> {
  const parts = path.split('/');
  const paths = parts.map((_, index) => parts.slice(0, index + 1).join('/'));

  return prisma.category.findMany({
    where: { path: { in: paths } },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
  });
}

export async function getCollectionFacets(path: string): Promise<FacetCounts> {
  const pathPrefix = `${path}/%`;
  const baseWhere = Prisma.sql`p."isActive" = true AND (c.path = ${path} OR c.path LIKE ${pathPrefix})`;

  const [colors, sizes, materials, brands, priceRows] = await Promise.all([
    prisma.$queryRaw<FacetRow[]>(Prisma.sql`
      SELECT value, COUNT(DISTINCT p.id) AS count
      FROM products p
      JOIN product_categories pc ON pc."productId" = p.id
      JOIN categories c ON c.id = pc."categoryId"
      CROSS JOIN LATERAL unnest(p.colors) AS value
      WHERE ${baseWhere}
      GROUP BY value
      ORDER BY count DESC, value ASC
    `),
    prisma.$queryRaw<FacetRow[]>(Prisma.sql`
      SELECT value, COUNT(DISTINCT p.id) AS count
      FROM products p
      JOIN product_categories pc ON pc."productId" = p.id
      JOIN categories c ON c.id = pc."categoryId"
      CROSS JOIN LATERAL unnest(p.sizes) AS value
      WHERE ${baseWhere}
      GROUP BY value
      ORDER BY count DESC, value ASC
    `),
    prisma.$queryRaw<FacetRow[]>(Prisma.sql`
      SELECT value, COUNT(DISTINCT p.id) AS count
      FROM products p
      JOIN product_categories pc ON pc."productId" = p.id
      JOIN categories c ON c.id = pc."categoryId"
      CROSS JOIN LATERAL unnest(p.materials) AS value
      WHERE ${baseWhere}
      GROUP BY value
      ORDER BY count DESC, value ASC
    `),
    prisma.$queryRaw<FacetRow[]>(Prisma.sql`
      SELECT p.brand AS value, COUNT(DISTINCT p.id) AS count
      FROM products p
      JOIN product_categories pc ON pc."productId" = p.id
      JOIN categories c ON c.id = pc."categoryId"
      WHERE ${baseWhere} AND p.brand IS NOT NULL AND p.brand <> ''
      GROUP BY p.brand
      ORDER BY count DESC, p.brand ASC
    `),
    prisma.$queryRaw<PriceRangeRow[]>(Prisma.sql`
      SELECT MIN(pv.price) AS min, MAX(pv.price) AS max
      FROM product_variants pv
      JOIN products p ON p.id = pv."productId"
      JOIN product_categories pc ON pc."productId" = p.id
      JOIN categories c ON c.id = pc."categoryId"
      WHERE ${baseWhere} AND pv."inStock" = true
    `),
  ]);

  const priceRange = priceRows[0] ?? { min: 0, max: 0 };

  return {
    colors: toFacetRows(colors),
    sizes: toFacetRows(sizes),
    materials: toFacetRows(materials),
    brands: toFacetRows(brands),
    priceRange: {
      min: Number(priceRange.min ?? 0),
      max: Number(priceRange.max ?? 0),
    },
  };
}

export async function getCollectionData(params: CollectionQuery): Promise<CollectionResult | null> {
  const category = await getCategoryByPath(params.path);

  if (!category) return null;

  const page = params.page;
  const limit = params.limit;
  const where = getProductWhere(params);
  const variantWhere = getVariantPriceWhere(params);

  const [total, facets, breadcrumb] = await Promise.all([
    prisma.product.count({ where }),
    getCollectionFacets(params.path),
    getBreadcrumb(params.path),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const effectivePage = Math.min(page, totalPages);
  const effectiveSkip = (effectivePage - 1) * limit;

  const products =
    params.sort === 'newest'
      ? await prisma.product.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: effectiveSkip,
          take: limit,
          include: productInclude(variantWhere),
        })
      : await getProductsSortedByVariantPrice(where, variantWhere, params.sort, effectiveSkip, limit);

  return convertToPlainObject({
    category,
    products,
    facets,
    breadcrumb,
    total,
    page: effectivePage,
    totalPages,
  }) as unknown as CollectionResult;
}

async function getProductsSortedByVariantPrice(
  where: Prisma.ProductWhereInput,
  variantWhere: Prisma.ProductVariantWhereInput,
  sort: 'price_asc' | 'price_desc',
  skip: number,
  limit: number
) {
  const candidates = await prisma.product.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      variants: {
        where: variantWhere,
        orderBy: { price: 'asc' },
        take: 1,
        select: { price: true },
      },
    },
  });

  const sortedIds = candidates
    .sort((left, right) => {
      const leftVariant = left.variants[0];
      const rightVariant = right.variants[0];

      if (!leftVariant && !rightVariant) return right.createdAt.getTime() - left.createdAt.getTime();
      if (!leftVariant) return 1;
      if (!rightVariant) return -1;

      const leftPrice = Number(leftVariant.price);
      const rightPrice = Number(rightVariant.price);
      const priceDiff = sort === 'price_asc' ? leftPrice - rightPrice : rightPrice - leftPrice;

      if (priceDiff !== 0) return priceDiff;
      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .slice(skip, skip + limit)
    .map((product) => product.id);

  if (sortedIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: sortedIds } },
    include: productInclude(variantWhere),
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  return sortedIds.map((id) => productById.get(id)).filter((product): product is NonNullable<typeof product> => Boolean(product));
}