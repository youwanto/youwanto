import type { Prisma } from '@prisma/client';

export const CATALOG_PAGE_SIZE = 24;
export const CATALOG_CURRENCIES = ['GBP', 'EUR', 'USD', 'JPY'] as const;
export type CatalogSort = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';
export type CatalogQuery = {
  cursor?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: CatalogSort;
  currency: string;
};

export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const sort = params.get('sort') ?? 'newest';
  if (!['newest', 'price-asc', 'price-desc', 'name-asc'].includes(sort)) {
    throw new Error('Invalid sort order.');
  }
  const currency = params.get('currency') ?? 'GBP';
  if (!(CATALOG_CURRENCIES as readonly string[]).includes(currency)) {
    throw new Error('Unsupported catalog currency.');
  }
  const price = (key: string) => {
    const raw = params.get(key);
    if (raw === null) return undefined;
    const value = Number(raw);
    if (!raw.trim() || !Number.isFinite(value) || value < 0) throw new Error('Invalid price range.');
    return value;
  };
  const minPrice = price('minPrice');
  const maxPrice = price('maxPrice');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new Error('Minimum price cannot exceed maximum price.');
  }
  const cursor = params.get('cursor') || undefined;
  if (cursor && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor)) {
    throw new Error('Invalid cursor.');
  }
  return { sort: sort as CatalogSort, currency, minPrice, maxPrice, cursor,
    category: params.get('category') || undefined, brand: params.get('brand') || undefined };
}

export function buildCatalogQuery(query: CatalogQuery) {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    currency: query.currency,
    ...(query.category ? { categories: { some: { category: { OR: [
      { path: query.category }, { path: { startsWith: `${query.category}/` } },
    ] } } } } : {}),
    ...(query.brand ? { brand: query.brand } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? { price: { gte: query.minPrice, lte: query.maxPrice } } : {}),
  };
  const primary: Prisma.ProductOrderByWithRelationInput = query.sort === 'price-asc'
    ? { price: 'asc' } : query.sort === 'price-desc' ? { price: 'desc' }
    : query.sort === 'name-asc' ? { name: 'asc' } : { createdAt: 'desc' };
  return {
    where,
    orderBy: [primary, { id: 'asc' }] as Prisma.ProductOrderByWithRelationInput[],
    take: CATALOG_PAGE_SIZE + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
  };
}

export function catalogPage<T extends { id: string }>(rows: T[]) {
  const items = rows.slice(0, CATALOG_PAGE_SIZE);
  return { items, nextCursor: rows.length > CATALOG_PAGE_SIZE ? items[items.length - 1].id : null };
}

export function formatCatalogPrice(value: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}
