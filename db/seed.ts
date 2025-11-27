// prisma/seed.ts
import { RawProductSchema } from '@/lib/validator';
import { RawProductInput } from '@/types';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const PRODUCTS_TXT_PATH = path.join(__dirname, 'raw-data', 'sample-products.txt');

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const raw = fs.readFileSync(PRODUCTS_TXT_PATH, 'utf8').trim();

  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

 // keep only real product lines, drop HDR and TRL
  const dataLines = lines.filter((l) => !l.startsWith('HDR|') && !l.startsWith('TRL|'));
  const feedBatchId = `feed-${new Date().toISOString()}`;
  const rawProducts: RawProductInput[] = [];

  // Group per styleCode/model → one Product, many ProductVariants
  type GroupItem = {
    name: string;
    category: string;
    brand: string;
    description: string;
    primaryImg: string;
    gallery: string[];

    sku: string;
    ean: string | null;
    size: string | null;
    color: string | null;

    price: number;
    currency: string;
    quantity: number;
    stockStatus: string;
  };

  const groups = new Map<string, GroupItem[]>();

  for (const line of dataLines) {
    const parts = line.split('|');

    const productIdFeed = parts[0] || null;
    const name          = parts[1] || 'Unnamed product';
    const sku           = parts[2] || '';
    const category      = parts[3] || 'Uncategorized';
    const brand         = parts[16] || parts[20] || 'Unknown';
    const styleCode     = parts[19] || null;          // model
    const longDesc      = parts[9] || parts[8] || '';
    const priceRaw      = parts[13] || '0';
    const stockStatus   = parts[22] || '';
    const ean           = parts[23] || null;
    const quantityRaw   = parts[24] || '0';
    const currency      = (parts[25] || 'USD').toUpperCase();
    const primaryImg    = parts[6] || '';
    const galleryRaw    = parts[26] || '';
    const size          = parts[30] || null;
    const color         = parts[32] || null;

    const price = parseFloat(priceRaw) || 0;
    const quantity = parseInt(quantityRaw, 10) || 0;

    const gallery = galleryRaw
      .split(',')
      .map(u => u.trim())
      .filter(Boolean);

    // ---- 1) Build and validate RawProduct ----
    const rawJson = {
      productId: parts[0],
      name: parts[1],
      sku: parts[2],
      category: parts[3],
      subcategory: parts[4],
      productUrl: parts[5],
      primaryImage: parts[6],
      shortDescription: parts[8],
      longDescription: parts[9],
      price: parts[13],
      brand: parts[16],
      model: parts[19],
      brandName: parts[20],
      stockStatus: parts[22],
      ean: parts[23],
      quantity: parts[24],
      currency: parts[25],
      galleryImages: parts[26],
      size: parts[30],
      materials: parts[31],
      color: parts[32],
      gender: parts[33],
      ageGroup: parts[35],
    };

    const rawProduct = RawProductSchema.parse({
      source: '24S',
      feedBatchId,
      rawData: rawJson,
      sku,
      styleCode,
      productIdFeed,
      ean,
    });

    rawProducts.push(rawProduct);

    // ---- 2) Group into style → items for Product & Variants ----
    const key = styleCode || sku || productIdFeed || name;

    const item: GroupItem = {
      name,
      category,
      brand,
      description: longDesc,
      primaryImg,
      gallery,
      sku,
      ean,
      size,
      color,
      price,
      currency,
      quantity,
      stockStatus,
    };

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  console.log(`Parsed ${rawProducts.length} raw feed lines`);
  console.log(`Found ${groups.size} grouped products (by style)`);

  // ---- Insert RawProduct ----
  await prisma.rawProduct.createMany({
    data: rawProducts,
    skipDuplicates: true,
  });

  // ---- Create Products + ProductVariants ----
  let productCount = 0;
  let variantCount = 0;

  for (const [key, items] of groups.entries()) {
    const base = items[0];

    // Aggregate images
    const images = Array.from(
      new Set(
        [
          base.primaryImg,
          ...items.flatMap(i => i.gallery),
        ].filter(Boolean)
      )
    );
    const slugBase = slugify(base.name);
    const slug = `${slugBase}-${(key || '').toLowerCase()}`.replace(/-+$/,'');

    const totalStock = items.reduce((sum, i) => sum + i.quantity, 0);
    const prices = items.map(i => i.price || 0).filter(p => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const mainCurrency = base.currency || 'USD';
    const anyActive = items.some(
      i => i.stockStatus.toLowerCase() === 'in-stock'
    );

    // Build variants for this product
    const variantsData = items.map(i => ({
      sku: i.sku,
      ean: i.ean,
      size: i.size,
      color: i.color,
      stock: i.quantity,
      price: i.price,
      currency: i.currency,
      isActive: i.stockStatus.toLowerCase() === 'in-stock',
    }));

    const created = await prisma.product.create({
      data: {
        name: base.name,
        slug,
        category: base.category,
        images,
        brand: base.brand,
        description: base.description,
        stock: totalStock,
        price: minPrice,
        currency: mainCurrency,
        rating: 0,
        numReviews: 0,
        isFeatured: false,
        isActive: anyActive,
        banner: base.primaryImg || null,
        variants: {
          create: variantsData,
        },
      },
    });

    productCount += 1;
    variantCount += variantsData.length;
    console.log(
      `Created product ${created.slug} with ${variantsData.length} variants`
    );
  }

  console.log(`Seeding done ✅ Products: ${productCount}, Variants: ${variantCount}`);
}
  // ---- Optional: clear current Products & Variants before reseeding ----
  // await prisma.productVariant.deleteMany();
  // await prisma.product.deleteMany();
//   const productsData = dataLines.map((line) => {
//     const parts = line.split('|');

//     const productId   = parts[0] || '';
//     const name        = parts[1] || 'Unnamed product';
//     const category    = parts[3] || 'Uncategorized';
//     const longDesc    = parts[9] || parts[8] || '';
//     const priceRaw    = parts[13] || '0';
//     const brand       = parts[16] || parts[20] || 'Unknown';
//     const stockStatus = parts[22] || '';
//     const quantityRaw = parts[24] || '0';
//     const primaryImg  = parts[6] || '';
//     const galleryRaw  = parts[26] || '';

//     const price = parseFloat(priceRaw) || 0;
//     const stock = parseInt(quantityRaw, 10) || 0;
//     const currency = (parts[25] || 'USD').toUpperCase();

//     const galleryImages = galleryRaw
//       .split(',')
//       .map(u => u.trim())
//       .filter(u => u.length > 0);

//     const images = Array.from(
//       new Set(
//         [primaryImg, ...galleryImages].filter(u => u && u.length > 0)
//       )
//     );

//     const baseSlug = slugify(name);
//     // add some of productId to avoid collisions
//     const slug = productId
//       ? `${baseSlug}-${productId.slice(-6)}`
//       : baseSlug;

//     const isActive = stockStatus.toLowerCase() === 'in-stock';

//     return {
//       name,
//       slug,
//       category,
//       images,
//       brand,
//       description: longDesc,
//       stock,
//       price,
//       currency,
//       rating: 0,
//       numReviews: 0,
//       isFeatured: false,
//       isActive,
//       banner: primaryImg || null,
//     };
//   });

//   console.log(`Preparing to insert ${productsData.length} products...`);

//   // Optional: clear the table first
//   await prisma.product.deleteMany();

//   await prisma.product.createMany({
//     data: productsData,
//     skipDuplicates: true, // in case slug unique constraint hits
//   });

//   console.log('Seeding completed ✅');
// }

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
