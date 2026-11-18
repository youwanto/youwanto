// Imports the discounted products from the downloaded affiliate feeds into the catalogue.
//
//   npm run import:deals -- --feeds /path/to/raw_data --dry-run
//   npm run import:deals -- --feeds /path/to/raw_data
//
// Options:
//   --feeds <dir>        folder holding rakuten/ and partnerize_outnet/ (or set FEED_RAW_DIR)
//   --dry-run            read and map the feeds, write nothing
//   --sources a,b        rakuten, outnet (default: both)
//   --merchants a,b      only these merchant ids (Rakuten merchant number, or "outnet")
//   --max-age-days <n>   refuse feeds older than this (default 3; 0 disables the check)
//   --force              switch off missing products even when most of a merchant's range disappeared
//
// The run is safe to repeat. See lib/feeds/upsert.ts for what is written.

import { PrismaClient } from '@prisma/client';
import { BLACK_FRIDAY_TAG } from '../lib/feeds/normalize';
import {
  FeedReadResult,
  findLatestOutnetFile,
  findLatestRakutenFiles,
  readOutnetFile,
  readRakutenFile,
} from '../lib/feeds/readers';
import { upsertMerchantProducts, UpsertSummary } from '../lib/feeds/upsert';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const list = (name: string) => option(name)?.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);

const rawDir = option('feeds') ?? process.env.FEED_RAW_DIR;
const dryRun = flag('dry-run');
const sources = list('sources') ?? ['rakuten', 'outnet'];
const merchants = list('merchants');
const maxAgeDays = Number(option('max-age-days') ?? 3);

const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`);

const ageInDays = (feedDate: string) => Math.floor((Date.now() - new Date(`${feedDate}T00:00:00Z`).getTime()) / 86_400_000);

type MerchantReport = Omit<FeedReadResult, 'products'> & {
  discountedProducts: number;
  variants: number;
  blackFriday: number;
  stale: boolean;
  topCategories: Record<string, number>;
  result?: UpsertSummary;
  /** Why the feed was left out (not a failure) */
  skipped?: string;
  error?: string;
};

async function main() {
  if (!rawDir) throw new Error('Pass --feeds <dir> or set FEED_RAW_DIR');

  const prisma = new PrismaClient();
  const reports: MerchantReport[] = [];

  const handle = async (read: FeedReadResult) => {
    if (merchants && !merchants.includes(read.merchantId.toLowerCase())) return;
    const { products, ...feed } = read;

    const categoryCounts = new Map<string, number>();
    for (const product of products) {
      categoryCounts.set(product.categoryPath, (categoryCounts.get(product.categoryPath) ?? 0) + 1);
    }
    const report: MerchantReport = {
      ...feed,
      discountedProducts: products.length,
      variants: products.reduce((total, product) => total + product.variants.length, 0),
      blackFriday: products.filter((product) => product.searchTags.includes(BLACK_FRIDAY_TAG)).length,
      stale: maxAgeDays > 0 && ageInDays(read.feedDate) > maxAgeDays,
      topCategories: Object.fromEntries([...categoryCounts].sort((a, b) => b[1] - a[1]).slice(0, 8)),
    };
    reports.push(report);

    if (report.stale) {
      // Old prices and sold-out products would send shoppers to dead offers
      report.skipped = `feed is ${ageInDays(read.feedDate)} days old (limit ${maxAgeDays})`;
    } else if (!dryRun && products.length > 0) {
      try {
        report.result = await upsertMerchantProducts(prisma, products[0].source, read.merchantId, products, {
          force: flag('force'),
        });
      } catch (error) {
        report.error = error instanceof Error ? error.message.slice(0, 500) : String(error);
      }
    }

    const outcome = report.error
      ? `ERROR ${report.error}`
      : report.skipped
        ? `SKIPPED ${report.skipped}`
        : report.result
          ? `created ${report.result.created}, updated ${report.result.updated}, switched off ${report.result.deactivated}` +
            (report.result.deactivationSkipped ? ' (switch-off skipped: most of the range disappeared, use --force)' : '')
          : dryRun
            ? 'dry run'
            : 'nothing to import';
    log(
      `${read.merchantName} [${read.merchantId}] feed ${read.feedDate}: ${report.rowsRead} rows, ` +
        `${report.discountedProducts} discounted products (${report.variants} sizes), ` +
        `${report.blackFriday} Black Friday, ${report.outOfRange} out of range → ${outcome}`,
    );
  };

  try {
    if (sources.includes('rakuten')) {
      const latest = findLatestRakutenFiles(rawDir);
      if (!latest) log('Rakuten: no feed files found');
      for (const file of latest?.files ?? []) await handle(await readRakutenFile(file, latest!.feedDate));
    }
    if (sources.includes('outnet')) {
      const latest = findLatestOutnetFile(rawDir);
      if (!latest) log('Outnet: no feed file found');
      else await handle(readOutnetFile(latest.file, latest.feedDate));
    }
  } finally {
    await prisma.$disconnect();
  }

  const used = reports.filter((report) => !report.skipped);
  const total = (pick: (report: MerchantReport) => number) => used.reduce((sum, report) => sum + pick(report), 0);
  const failed = reports.filter((report) => report.error);
  const skipped = reports.filter((report) => report.skipped);
  log(
    `${dryRun ? 'DRY RUN ' : ''}TOTAL: ${total((r) => r.discountedProducts)} discounted products, ` +
      `${total((r) => r.variants)} sizes, ${total((r) => r.blackFriday)} Black Friday, ` +
      `${total((r) => r.result?.created ?? 0)} created, ${total((r) => r.result?.updated ?? 0)} updated, ` +
      `${total((r) => r.result?.deactivated ?? 0)} switched off, ${skipped.length} feeds skipped, ` +
      `${failed.length} merchants with errors`,
  );
  if (flag('json')) console.log(JSON.stringify(reports, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
