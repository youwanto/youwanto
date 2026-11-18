// Writes one merchant's discounted products to the catalogue.
// Products are matched on (source, externalId), so a re-run updates instead of duplicating.
// Nothing is deleted: products that left the feed are switched off (isActive = false).

import { Prisma, PrismaClient } from '@prisma/client';
import { FeedProduct, resolveExistingPath } from './normalize';

const BATCH_SIZE = 400;
/** Refuse to switch off most of a merchant's products at once: that usually means a broken feed */
const MIN_KEPT_SHARE = 0.3;
const GUARD_MIN_ACTIVE = 100;

export type UpsertSummary = {
  created: number;
  updated: number;
  variants: number;
  variantsDeactivated: number;
  deactivated: number;
  deactivationSkipped: boolean;
  uncategorised: number;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
};

const unique = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => !!value))];

export async function upsertMerchantProducts(
  prisma: PrismaClient,
  source: FeedProduct['source'],
  merchantId: string,
  products: FeedProduct[],
  options: { force?: boolean } = {},
): Promise<UpsertSummary> {
  const summary: UpsertSummary = {
    created: 0, updated: 0, variants: 0, variantsDeactivated: 0, deactivated: 0, deactivationSkipped: false, uncategorised: 0,
  };

  const [{ now: runStartedAt }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT now() AS now`;
  const categories = await prisma.category.findMany({ select: { id: true, path: true } });
  const categoryIdByPath = new Map(categories.map((category) => [category.path, category.id]));
  const knownPaths = new Set(categoryIdByPath.keys());

  for (const batch of chunk(products, BATCH_SIZE)) {
    const productRows = batch.map((product) => {
      const prices = product.variants.map((variant) => variant.price);
      const first = product.variants[0];
      const images = unique([first.imageUrl, ...product.variants.flatMap((variant) => variant.images)]).slice(0, 8);
      return {
        name: product.name,
        slug: product.slug,
        description: product.description,
        brand: product.brand,
        gender: product.gender,
        colors: unique(product.variants.map((variant) => variant.color)),
        sizes: unique(product.variants.map((variant) => variant.size)),
        materials: unique(product.variants.map((variant) => variant.material)),
        searchTags: product.searchTags,
        imageUrl: images[0] ?? null,
        images,
        externalId: product.externalId,
        groupId: product.groupId,
        price: Math.min(...prices),
        currency: first.currency,
      };
    });

    const saved = await prisma.$queryRaw<{ id: string; externalId: string; inserted: boolean }[]>`
      INSERT INTO products
        (name, product_slug_idx, description, brand, gender, colors, sizes, materials, "searchTags",
         "imageUrl", images, source, "merchantId", "externalId", "groupId", price, currency, "isActive", "updatedAt")
      SELECT x.name, x.slug, x.description, x.brand, x.gender::"Gender",
             ARRAY(SELECT jsonb_array_elements_text(x.colors)),
             ARRAY(SELECT jsonb_array_elements_text(x.sizes)),
             ARRAY(SELECT jsonb_array_elements_text(x.materials)),
             ARRAY(SELECT jsonb_array_elements_text(x."searchTags")),
             x."imageUrl",
             ARRAY(SELECT jsonb_array_elements_text(x.images)),
             ${source}::"FeedSource", ${merchantId}, x."externalId", x."groupId", x.price, x.currency, true, now()
      FROM jsonb_to_recordset(${JSON.stringify(productRows)}::jsonb) AS x(
        name text, slug text, description text, brand text, gender text, colors jsonb, sizes jsonb, materials jsonb,
        "searchTags" jsonb, "imageUrl" text, images jsonb, "externalId" text, "groupId" text, price numeric, currency text)
      ON CONFLICT (source, "externalId") DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, brand = EXCLUDED.brand, gender = EXCLUDED.gender,
        colors = EXCLUDED.colors, sizes = EXCLUDED.sizes, materials = EXCLUDED.materials,
        "searchTags" = EXCLUDED."searchTags", "imageUrl" = EXCLUDED."imageUrl", images = EXCLUDED.images,
        "merchantId" = EXCLUDED."merchantId", "groupId" = EXCLUDED."groupId",
        price = EXCLUDED.price, currency = EXCLUDED.currency, "isActive" = true, "updatedAt" = now()
      RETURNING id, "externalId", (xmax = 0) AS inserted`;

    const productIdByExternalId = new Map(saved.map((row) => [row.externalId, row.id]));
    summary.created += saved.filter((row) => row.inserted).length;
    summary.updated += saved.filter((row) => !row.inserted).length;

    const variantRows = batch.flatMap((product) =>
      product.variants.map((variant) => ({ ...variant, productId: productIdByExternalId.get(product.externalId) })),
    );
    for (const variantBatch of chunk(variantRows, BATCH_SIZE * 2)) {
      await prisma.$executeRaw`
        INSERT INTO product_variants
          ("productId", "externalId", sku, ean, color, size, material, price, "compareAtPrice", "discountPct", currency,
           "inStock", "stockQty", stock, "deepLink", "imageUrl", images, "isActive", "updatedAt")
        SELECT x."productId"::uuid, x."externalId", x.sku, x.ean, x.color, x.size, x.material, x.price, x."compareAtPrice",
               x."discountPct", x.currency, x."inStock", x."stockQty", COALESCE(x."stockQty", 0), x."deepLink", x."imageUrl",
               ARRAY(SELECT jsonb_array_elements_text(x.images)), true, now()
        FROM jsonb_to_recordset(${JSON.stringify(variantBatch)}::jsonb) AS x(
          "productId" text, "externalId" text, sku text, ean text, color text, size text, material text, price numeric,
          "compareAtPrice" numeric, "discountPct" numeric, currency text, "inStock" boolean, "stockQty" int,
          "deepLink" text, "imageUrl" text, images jsonb)
        ON CONFLICT ("productId", "externalId") DO UPDATE SET
          sku = EXCLUDED.sku, ean = EXCLUDED.ean, color = EXCLUDED.color, size = EXCLUDED.size,
          material = EXCLUDED.material, price = EXCLUDED.price, "compareAtPrice" = EXCLUDED."compareAtPrice",
          "discountPct" = EXCLUDED."discountPct", currency = EXCLUDED.currency, "inStock" = EXCLUDED."inStock",
          "stockQty" = EXCLUDED."stockQty", stock = EXCLUDED.stock, "deepLink" = EXCLUDED."deepLink",
          "imageUrl" = EXCLUDED."imageUrl", images = EXCLUDED.images, "isActive" = true, "updatedAt" = now()`;
      summary.variants += variantBatch.length;
    }

    // Category links follow the current mapping rules, so they are rebuilt on every run
    const links = batch.flatMap((product) => {
      const path = resolveExistingPath(product.categoryPath, knownPaths);
      const productId = productIdByExternalId.get(product.externalId);
      if (!path || !productId) {
        summary.uncategorised++;
        return [];
      }
      return [{ productId, categoryId: categoryIdByPath.get(path)! }];
    });
    const productIds = [...productIdByExternalId.values()];
    await prisma.$transaction([
      prisma.$executeRaw`DELETE FROM product_categories WHERE "productId" = ANY(${productIds}::uuid[])`,
      prisma.productCategory.createMany({ data: links, skipDuplicates: true }),
    ]);
  }

  // Sizes that left the feed are no longer sold
  summary.variantsDeactivated = await prisma.$executeRaw`
    UPDATE product_variants v SET "inStock" = false, "isActive" = false
    FROM products p
    WHERE v."productId" = p.id AND p.source = ${source}::"FeedSource" AND p."merchantId" = ${merchantId}
      AND p."updatedAt" >= ${runStartedAt} AND v."updatedAt" < ${runStartedAt} AND v."isActive" = true`;

  // Products that are no longer discounted, or no longer in the feed, are switched off
  const staleWhere: Prisma.ProductWhereInput = { source, merchantId, isActive: true, updatedAt: { lt: runStartedAt } };
  const stale = await prisma.product.count({ where: staleWhere });
  const active = stale + products.length;
  if (!options.force && active >= GUARD_MIN_ACTIVE && products.length < active * MIN_KEPT_SHARE) {
    summary.deactivationSkipped = true;
  } else if (stale > 0) {
    // Raw SQL keeps "updatedAt" untouched, so the switch-off does not look like a content change
    summary.deactivated = await prisma.$executeRaw`
      UPDATE products SET "isActive" = false
      WHERE source = ${source}::"FeedSource" AND "merchantId" = ${merchantId} AND "isActive" = true
        AND "updatedAt" < ${runStartedAt}`;
  }

  return summary;
}
