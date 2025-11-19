// prisma/seed.ts
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

  const productsData = dataLines.map((line) => {
    const parts = line.split('|');

    const productId   = parts[0] || '';
    const name        = parts[1] || 'Unnamed product';
    const category    = parts[3] || 'Uncategorized';
    const longDesc    = parts[9] || parts[8] || '';
    const priceRaw    = parts[13] || '0';
    const brand       = parts[16] || parts[20] || 'Unknown';
    const stockStatus = parts[22] || '';
    const quantityRaw = parts[24] || '0';
    const primaryImg  = parts[6] || '';
    const galleryRaw  = parts[26] || '';

    const price = parseFloat(priceRaw) || 0;
    const stock = parseInt(quantityRaw, 10) || 0;
    const currency = (parts[25] || 'USD').toUpperCase();

    const galleryImages = galleryRaw
      .split(',')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    const images = Array.from(
      new Set(
        [primaryImg, ...galleryImages].filter(u => u && u.length > 0)
      )
    );

    const baseSlug = slugify(name);
    // add some of productId to avoid collisions
    const slug = productId
      ? `${baseSlug}-${productId.slice(-6)}`
      : baseSlug;

    const isActive = stockStatus.toLowerCase() === 'in-stock';

    return {
      name,
      slug,
      category,
      images,
      brand,
      description: longDesc,
      stock,
      price,
      currency,
      rating: 0,
      numReviews: 0,
      isFeatured: false,
      isActive,
      banner: primaryImg || null,
    };
  });

  console.log(`Preparing to insert ${productsData.length} products...`);

  // Optional: clear the table first
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: productsData,
    skipDuplicates: true, // in case slug unique constraint hits
  });

  console.log('Seeding completed ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
