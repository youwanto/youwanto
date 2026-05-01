'use server';

import { prisma } from '@/db/prisma';
import { getBreadcrumb } from '@/lib/actions/collection';
import { convertToPlainObject } from '@/lib/utils';
import { Category, Prisma } from '@prisma/client';

type SerializedProductVariant = Omit<
  Prisma.ProductVariantGetPayload<Record<string, never>>,
  'price' | 'compareAtPrice' | 'discountPct'
> & {
  price: string;
  compareAtPrice: string | null;
  discountPct: string | null;
};

export type ProductWithVariant = Omit<
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
  variants: SerializedProductVariant[];
};

export type ProductDetail = ProductWithVariant & {
  breadcrumb: Category[];
};

export type ProductDetailVariant = SerializedProductVariant;

const cheapestInStockVariantInclude = {
  where: { inStock: true },
  orderBy: { price: 'asc' as const },
  take: 1,
};

const productDetailInclude = {
  variants: { orderBy: { price: 'asc' as const } },
  categories: { include: { category: true } },
};

const getPrimaryCategory = (categories: ProductDetail['categories']) => {
  return [...categories]
    .map((row) => row.category)
    .sort((left, right) => right.level - left.level || left.sortOrder - right.sortOrder)[0];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: productDetailInclude,
  });

  if (!product) return null;

  const plainProduct = convertToPlainObject(product) as unknown as ProductWithVariant;
  const primaryCategory = getPrimaryCategory(plainProduct.categories);
  const breadcrumb = primaryCategory ? await getBreadcrumb(primaryCategory.path) : [];

  return {
    ...plainProduct,
    breadcrumb,
  };
}

export async function getRelatedProducts(
  productId: string,
  categoryPath: string,
  limit = 8
): Promise<ProductWithVariant[]> {
  const queryByPath = async (path: string, includeChildren: boolean) => {
    return prisma.product.findMany({
      where: {
        id: { not: productId },
        isActive: true,
        categories: {
          some: {
            category: includeChildren
              ? { OR: [{ path }, { path: { startsWith: `${path}/` } }] }
              : { path },
          },
        },
        variants: { some: { inStock: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        categories: { include: { category: true } },
        variants: cheapestInStockVariantInclude,
      },
    });
  };

  const sameCategoryProducts = await queryByPath(categoryPath, false);
  const pathParts = categoryPath.split('/');

  if (sameCategoryProducts.length >= 4 || pathParts.length < 3) {
    return convertToPlainObject(sameCategoryProducts) as unknown as ProductWithVariant[];
  }

  const parentPath = pathParts.slice(0, 2).join('/');
  const parentCategoryProducts = await queryByPath(parentPath, true);

  return convertToPlainObject(parentCategoryProducts) as unknown as ProductWithVariant[];
}