// Reads the downloaded affiliate feeds and returns the discounted products they contain.
// Feed layouts are documented in the ecom-data-transmission project.

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import zlib from 'zlib';
import {
  buildFeedProduct,
  buildPricing,
  cleanProductName,
  cleanText,
  FeedProduct,
  FeedVariant,
  isOutOfRange,
  mentionsBlackFriday,
  normalizeColor,
  normalizeSize,
  parsePrice,
  splitImages,
} from './normalize';

export type FeedReadResult = {
  merchantId: string;
  merchantName: string;
  file: string;
  feedDate: string;
  rowsRead: number;
  rowsSkipped: number;
  productsInFeed: number;
  outOfRange: number;
  /** Only products with at least one discounted variant */
  products: FeedProduct[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IMAGES = 6;
const MAX_DESCRIPTION_LENGTH = 1500;

const hasDiscount = (variants: FeedVariant[]) => variants.some((variant) => variant.compareAtPrice !== null);

// ────────────────────────────────────────────────────────────
// Rakuten: pipe-delimited, 38 positional columns, HDR and TRL lines
// ────────────────────────────────────────────────────────────

const RAKUTEN_COLUMNS = 38;
const R = {
  id: 0, name: 1, sku: 2, category: 4, link: 5, image: 6, shortDescription: 8, description: 9,
  salePrice: 12, price: 13, brand: 16, styleCode: 18, availability: 22, gtin: 23, currency: 25,
  moreImages: 26, skuRoot: 28, merchantCategory: 29, size: 30, material: 31, color: 32, gender: 33, ageGroup: 35,
} as const;

/** Newest dated folder that holds full product files */
export function findLatestRakutenFiles(rawDir: string): { feedDate: string; files: string[] } | null {
  const root = path.join(rawDir, 'rakuten');
  if (!fs.existsSync(root)) return null;
  const days = fs.readdirSync(root).filter((name) => DATE_PATTERN.test(name)).sort().reverse();

  for (const day of days) {
    const files = fs
      .readdirSync(path.join(root, day))
      .filter((name) => /_mp\.txt(\.gz)?$/.test(name))
      .sort()
      .map((name) => path.join(root, day, name));
    if (files.length > 0) return { feedDate: day, files };
  }
  return null;
}

/** Merchants whose group field (column 29) does not identify a style: use the style code instead */
const GROUP_BY_STYLE_CODE = new Set(['44328' /* The Double F */]);

/** The feed's own group field is not reliable for every merchant, so fall back to other style keys */
function rakutenGroupKey(row: string[], merchantId: string): string {
  const hasValue = (value: string) => /[a-z0-9]/i.test(value);
  if (!GROUP_BY_STYLE_CODE.has(merchantId) && hasValue(row[R.skuRoot])) return row[R.skuRoot].trim();
  if (hasValue(row[R.styleCode])) return row[R.styleCode].trim();
  if (hasValue(row[R.image])) return row[R.image].trim();
  return row[R.sku].trim() || row[R.id].trim();
}

export async function readRakutenFile(file: string, feedDate: string): Promise<FeedReadResult> {
  const input = file.endsWith('.gz') ? fs.createReadStream(file).pipe(zlib.createGunzip()) : fs.createReadStream(file);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });

  let merchantId = '';
  let merchantName = '';
  let rowsRead = 0;
  let rowsSkipped = 0;
  const groups = new Map<string, string[][]>();

  for await (const line of lines) {
    if (!line) continue;
    if (line.startsWith('HDR|')) {
      [, merchantId, merchantName] = line.split('|');
      continue;
    }
    if (line.startsWith('TRL|')) continue;

    rowsRead++;
    const row = line.split('|');
    if (row.length !== RAKUTEN_COLUMNS || !row[R.id] || !row[R.link].startsWith('http')) {
      rowsSkipped++;
      continue;
    }
    const key = rakutenGroupKey(row, merchantId);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  if (!merchantId) throw new Error(`No HDR line in ${file}`);

  const products: FeedProduct[] = [];
  let outOfRange = 0;

  for (const [groupId, rows] of groups) {
    const variants: FeedVariant[] = [];
    for (const row of rows) {
      const pricing = buildPricing(parsePrice(row[R.salePrice]), parsePrice(row[R.price]));
      if (!pricing) continue;
      variants.push({
        externalId: row[R.id],
        sku: cleanText(row[R.sku], 120),
        ean: cleanText(row[R.gtin], 20),
        color: normalizeColor(row[R.color]),
        size: normalizeSize(row[R.size]),
        material: cleanText(row[R.material], 160),
        ...pricing,
        currency: (row[R.currency] || 'GBP').toUpperCase(),
        inStock: row[R.availability].toLowerCase() === 'in-stock',
        stockQty: null,
        deepLink: row[R.link],
        imageUrl: row[R.image].startsWith('http') ? row[R.image] : null,
        images: splitImages(row[R.moreImages]).slice(0, MAX_IMAGES),
      });
    }
    if (!hasDiscount(variants)) continue;

    const first = rows[0];
    const segments = (value: string, separator: string | RegExp) =>
      value.split(separator).map((segment) => segment.trim()).filter(Boolean);
    const categorySegments = segments(first[R.merchantCategory], '>');
    const networkSegments = segments(first[R.category], '~~');
    if (
      /kids|infant|toddler|newborn/i.test(first[R.ageGroup]) ||
      isOutOfRange([...categorySegments, ...networkSegments].join(' '))
    ) {
      outOfRange++;
      continue;
    }

    const brand = cleanText(first[R.brand], 80);
    const description = cleanText(first[R.description] || first[R.shortDescription], MAX_DESCRIPTION_LENGTH);
    products.push(
      buildFeedProduct({
        source: 'RAKUTEN',
        merchantId,
        merchantName,
        groupId,
        name: cleanProductName(first[R.name], normalizeSize(first[R.size]), brand),
        description,
        brand,
        genderRaw: first[R.gender],
        categorySegments,
        networkSegments,
        blackFriday: rows.some((row) => mentionsBlackFriday(row[R.name], row[R.description], row[R.shortDescription], row[7])),
        variants,
      }),
    );
  }

  return {
    merchantId, merchantName, file, feedDate, rowsRead, rowsSkipped,
    productsInFeed: groups.size, outOfRange, products,
  };
}

// ────────────────────────────────────────────────────────────
// The Outnet (Partnerize): XML, one <product> per size
// ────────────────────────────────────────────────────────────

const OUTNET_MERCHANT_ID = 'outnet';

export function findLatestOutnetFile(rawDir: string): { feedDate: string; file: string } | null {
  const root = path.join(rawDir, 'partnerize_outnet');
  if (!fs.existsSync(root)) return null;
  const latest = fs.readdirSync(root).filter((name) => /^Outnet_\d{4}-\d{2}-\d{2}\.xml$/.test(name)).sort().pop();
  if (!latest) return null;
  return { feedDate: latest.slice('Outnet_'.length, -'.xml'.length), file: path.join(root, latest) };
}

const decodeXml = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

function parseOutnetProduct(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldPattern = /<(\w+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/g;
  for (const match of block.matchAll(fieldPattern)) {
    fields[match[1]] = (match[2] ?? decodeXml(match[3] ?? '')).trim();
  }
  return fields;
}

export function readOutnetFile(file: string, feedDate: string): FeedReadResult {
  const xml = fs.readFileSync(file, 'utf8');
  // The feed says when it was generated; it can stay unchanged for weeks
  const generatedAt = xml.slice(0, 2000).match(/file was created at: (\d{4}-\d{2}-\d{2})/)?.[1];

  let rowsRead = 0;
  let rowsSkipped = 0;
  const groups = new Map<string, Record<string, string>[]>();

  for (const match of xml.matchAll(/<product>([\s\S]*?)<\/product>/g)) {
    rowsRead++;
    const row = parseOutnetProduct(match[1]);
    if (!row.Product_ID || !row.Product_URL?.startsWith('http')) {
      rowsSkipped++;
      continue;
    }
    const key = row.item_group_id || row.Product_ID;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const products: FeedProduct[] = [];
  let outOfRange = 0;

  for (const [groupId, rows] of groups) {
    const variants: FeedVariant[] = [];
    for (const row of rows) {
      const pricing = buildPricing(parsePrice(row.sale_price), parsePrice(row.Product_Value));
      if (!pricing) continue;
      const stockQty = Number.parseInt(row.availability, 10);
      variants.push({
        externalId: row.Product_ID,
        sku: cleanText(row.mpn, 120),
        ean: cleanText(row.gtin, 20),
        color: normalizeColor(row.color),
        size: normalizeSize(row.size),
        material: cleanText(row.material, 160),
        ...pricing,
        // The feed has no currency field; this is the UK feed (IDs start with "GB_")
        currency: 'GBP',
        inStock: Number.isFinite(stockQty) ? stockQty > 0 : true,
        stockQty: Number.isFinite(stockQty) ? stockQty : null,
        deepLink: row.Product_URL,
        imageUrl: row.Product_Image?.startsWith('http') ? row.Product_Image : null,
        images: splitImages(row.additional_image_link).slice(0, MAX_IMAGES),
      });
    }
    if (!hasDiscount(variants)) continue;

    const first = rows[0];
    const categorySegments = (first.Product_Category ?? '').split('>').map((segment) => segment.trim()).filter(Boolean);
    if (/kids|infant|toddler|newborn/i.test(first.age_group ?? '') || isOutOfRange(categorySegments.join(' '))) {
      outOfRange++;
      continue;
    }

    const brand = cleanText(first.brand, 80);
    products.push(
      buildFeedProduct({
        source: 'OUTNET',
        merchantId: OUTNET_MERCHANT_ID,
        merchantName: 'The Outnet',
        groupId,
        name: cleanProductName(first.Product_Name ?? '', normalizeSize(first.size), brand),
        description: cleanText(first.description, MAX_DESCRIPTION_LENGTH),
        brand,
        genderRaw: first.gender,
        categorySegments,
        blackFriday: rows.some((row) => mentionsBlackFriday(row.Product_Name, row.description, row.badges)),
        variants,
      }),
    );
  }

  return {
    merchantId: OUTNET_MERCHANT_ID,
    merchantName: 'The Outnet',
    file,
    feedDate: generatedAt ?? feedDate,
    rowsRead, rowsSkipped, productsInFeed: groups.size, outOfRange, products,
  };
}
