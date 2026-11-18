'use server';

import { prisma } from '@/db/prisma';
import { collectionQuerySchema } from '@/lib/validator';
import { convertToPlainObject } from '@/lib/utils';
import { Category, Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
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

// A large category has thousands of distinct values (materials are free text). Listing them all
// made collection pages weigh over 1 MB, so only the most common values are offered as filters.
const MAX_FACET_OPTIONS = 40;

async function computeCollectionFacets(path: string): Promise<FacetCounts> {
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
      LIMIT ${MAX_FACET_OPTIONS}
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
      LIMIT ${MAX_FACET_OPTIONS}
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
      LIMIT ${MAX_FACET_OPTIONS}
    `),
    prisma.$queryRaw<FacetRow[]>(Prisma.sql`
      SELECT p.brand AS value, COUNT(DISTINCT p.id) AS count
      FROM products p
      JOIN product_categories pc ON pc."productId" = p.id
      JOIN categories c ON c.id = pc."categoryId"
      WHERE ${baseWhere} AND p.brand IS NOT NULL AND p.brand <> ''
      GROUP BY p.brand
      ORDER BY count DESC, p.brand ASC
      LIMIT ${MAX_FACET_OPTIONS}
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

async function computeNonEmptyCategoryPaths(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ path: string }[]>(Prisma.sql`
    SELECT DISTINCT c.path
    FROM categories c
    JOIN product_categories pc ON pc."categoryId" = c.id
    JOIN products p ON p.id = pc."productId"
    WHERE p."isActive" = true
  `);

  // A category also counts as non-empty when one of its sub-categories has products
  const paths = new Set<string>();
  for (const { path } of rows) {
    const parts = path.split('/');
    parts.forEach((_, index) => paths.add(parts.slice(0, index + 1).join('/')));
  }
  return [...paths].sort();
}

const getCachedNonEmptyCategoryPaths = unstable_cache(computeNonEmptyCategoryPaths, ['non-empty-category-paths'], {
  revalidate: 3600,
});

/** Paths of the categories that currently show at least one product */
export async function getNonEmptyCategoryPaths(): Promise<string[]> {
  return getCachedNonEmptyCategoryPaths();
}

// Facets only depend on the category path (not on the active filters), so cache them
const getCachedCollectionFacets = unstable_cache(computeCollectionFacets, ['collection-facets'], {
  revalidate: 3600,
});

export async function getCollectionFacets(path: string): Promise<FacetCounts> {
  return getCachedCollectionFacets(path);
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
      : await getProductsSortedByVariantPrice(params, variantWhere, params.sort, effectiveSkip, limit);

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

// Sorts and paginates in SQL by each product's cheapest matching in-stock variant.
// The conditions below must stay in sync with getProductWhere / getVariantPriceWhere.
async function getProductsSortedByVariantPrice(
  params: CollectionQuery,
  variantWhere: Prisma.ProductVariantWhereInput,
  sort: 'price_asc' | 'price_desc',
  skip: number,
  limit: number
) {
  const pathPrefix = `${params.path}/%`;
  const textArray = (values: string[]) => Prisma.sql`ARRAY[${Prisma.join(values)}]::text[]`;

  const variantConditions = [Prisma.sql`pv."inStock" = true`];
  if (params.minPrice !== undefined) variantConditions.push(Prisma.sql`pv.price >= ${params.minPrice}`);
  if (params.maxPrice !== undefined) variantConditions.push(Prisma.sql`pv.price <= ${params.maxPrice}`);

  const hasVariantFilter = params.inStock || params.minPrice !== undefined || params.maxPrice !== undefined;

  const conditions = [
    Prisma.sql`p."isActive" = true`,
    Prisma.sql`EXISTS (
      SELECT 1
      FROM product_categories pc
      JOIN categories c ON c.id = pc."categoryId"
      WHERE pc."productId" = p.id AND (c.path = ${params.path} OR c.path LIKE ${pathPrefix})
    )`,
  ];
  if (params.colors.length > 0) conditions.push(Prisma.sql`p.colors && ${textArray(params.colors)}`);
  if (params.sizes.length > 0) conditions.push(Prisma.sql`p.sizes && ${textArray(params.sizes)}`);
  if (params.materials.length > 0) conditions.push(Prisma.sql`p.materials && ${textArray(params.materials)}`);
  if (params.brands.length > 0) conditions.push(Prisma.sql`p.brand IN (${Prisma.join(params.brands)})`);
  if (hasVariantFilter) conditions.push(Prisma.sql`v.price IS NOT NULL`);

  const direction = sort === 'price_asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id
    FROM products p
    LEFT JOIN LATERAL (
      SELECT MIN(pv.price) AS price
      FROM product_variants pv
      WHERE pv."productId" = p.id AND ${Prisma.join(variantConditions, ' AND ')}
    ) v ON true
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY v.price ${direction} NULLS LAST, p."createdAt" DESC, p.id ASC
    LIMIT ${limit} OFFSET ${skip}
  `);
  const sortedIds = rows.map((row) => row.id);

  if (sortedIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: sortedIds } },
    include: productInclude(variantWhere),
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  return sortedIds.map((id) => productById.get(id)).filter((product): product is NonNullable<typeof product> => Boolean(product));
}
