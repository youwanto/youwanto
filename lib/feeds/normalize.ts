// Shared helpers that turn raw affiliate-feed values into catalogue values.
// Pure functions only: no database or file access here.

import { createHash } from 'crypto';

export type FeedSourceName = 'RAKUTEN' | 'OUTNET';
export type FeedGender = 'FEMALE' | 'MALE' | 'UNISEX';

export type FeedVariant = {
  externalId: string;
  sku: string | null;
  ean: string | null;
  color: string | null;
  size: string | null;
  material: string | null;
  price: number;
  compareAtPrice: number | null;
  discountPct: number | null;
  currency: string;
  inStock: boolean;
  stockQty: number | null;
  /** Affiliate tracking link, stored untouched so clicks are attributed */
  deepLink: string;
  imageUrl: string | null;
  images: string[];
};

export type FeedProduct = {
  source: FeedSourceName;
  merchantId: string;
  merchantName: string;
  /** Unique per source: "<merchantId>:<group key>" */
  externalId: string;
  groupId: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  gender: FeedGender;
  categoryPath: string;
  rawCategory: string;
  searchTags: string[];
  variants: FeedVariant[];
};

export const BLACK_FRIDAY_TAG = 'black-friday';
const BLACK_FRIDAY_PATTERN = /black[\s\-_]?friday|black[\s\-_]?week|cyber[\s\-_]?(monday|week)/i;

export const mentionsBlackFriday = (...texts: (string | null | undefined)[]) =>
  texts.some((text) => !!text && BLACK_FRIDAY_PATTERN.test(text));

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Lower-case, accent-free text for keyword matching */
const fold = (input: string) =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Readable and stable product URL slug. The hash of the feed identity keeps it unique
 * without a database lookup, so the same product always gets the same URL.
 */
export function buildProductSlug(brand: string | null, name: string, source: string, externalId: string): string {
  const startsWithBrand = brand && fold(name).startsWith(fold(brand));
  const readable = slugify(startsWithBrand || !brand ? name : `${brand} ${name}`).slice(0, 80).replace(/-+$/, '');
  const hash = createHash('sha1').update(`${source}:${externalId}`).digest('hex').slice(0, 8);
  return `${readable || 'product'}-${hash}`;
}

export const cleanText = (value: string | null | undefined, maxLength?: number): string | null => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return maxLength && text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
};

export function parsePrice(value: string | null | undefined): number | null {
  const amount = Number.parseFloat((value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

/** Sale price and original price → the price fields stored on a variant */
export function buildPricing(salePrice: number | null, originalPrice: number | null) {
  const price = salePrice ?? originalPrice;
  if (price === null) return null;
  const discounted = originalPrice !== null && price < originalPrice;
  return {
    price,
    compareAtPrice: discounted ? originalPrice : null,
    discountPct: discounted ? Math.round((1 - price / originalPrice) * 10000) / 100 : null,
  };
}

export function normalizeSize(value: string | null | undefined): string | null {
  const size = cleanText(value, 40);
  if (!size) return null;
  // Some feeds repeat the size: "L - L"
  const repeated = size.match(/^(.+?)\s+-\s+(.+)$/);
  return repeated && repeated[1] === repeated[2] ? repeated[1] : size;
}

export function normalizeColor(value: string | null | undefined): string | null {
  const color = cleanText(value, 40);
  if (!color) return null;
  const lower = color.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function normalizeGender(value: string | null | undefined, categoryText = ''): FeedGender {
  const gender = fold(value ?? '').trim();
  if (gender === 'female' || gender === 'women' || gender === 'femme') return 'FEMALE';
  if (gender === 'male' || gender === 'men' || gender === 'homme') return 'MALE';
  if (gender === 'unisex') return 'UNISEX';

  const category = fold(categoryText);
  if (/\b(femmes?|women|womens|woman|ladies)\b/.test(category)) return 'FEMALE';
  if (/\b(hommes?|men|mens|man)\b/.test(category)) return 'MALE';
  return 'UNISEX';
}

/** Removes the size (and a leading brand) that some feeds append to the product name */
export function cleanProductName(name: string, size: string | null, brand?: string | null): string {
  let result = name.replace(/\s+/g, ' ').trim();
  result = result.replace(/\s+-\s+(taille|size)\b.*$/i, '');
  if (size) {
    const escaped = size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`(\\s+-)?\\s+${escaped}$`, 'i'), '');
  }
  if (brand) {
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`^${escapedBrand}\\s+-\\s+`, 'i'), '');
  }
  result = result.replace(/\s+(male|female|unisex)$/i, '');
  return result.trim() || name.trim();
}

export function splitImages(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/\s+>\s+|,(?=\s*https?:)/)
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//.test(url));
}

// ────────────────────────────────────────────────────────────
// Category mapping: merchant category text (English or French) → site taxonomy path
// ────────────────────────────────────────────────────────────

/** Products outside the site's range (beauty, home, children) are not imported */
const OUT_OF_RANGE_PATTERN =
  /\b(beaute|beauty|parfums?|fragrances?|maquillage|make-?up|skincare|soins?|maison|home|decor?|decoration|linge|linens?|bedding|cushions?|coussins?|candles?|bougies?|artwork|posters?|games?|jeux|enfants?|bebe|baby|kids?|garcons?|filles?|boys?|girls?|jouets?|toys?|high-?tech|electronique|gourmet|epicerie|food|pets?|livres?|books?)\b/;

export const isOutOfRange = (categoryText: string) => OUT_OF_RANGE_PATTERN.test(fold(categoryText));

type CategoryRule = {
  pattern: RegExp;
  /** `{dept}` is replaced by "women" or "men" */
  women: string;
  men?: string;
  /** A generic match: kept only if nothing more specific is found */
  weak?: boolean;
};

// Order matters: the first matching rule wins, so specific words come before the words they contain.
const CATEGORY_RULES: CategoryRule[] = [
  // Merchant category names that cover several product types: only a hint
  { pattern: /shirts? (&|and) tops/, women: 'women/tops', men: 'men/tops', weak: true },
  { pattern: /coats? (&|and) jackets|\bouterwear\b/, women: 'women/outerwear', men: 'men/outerwear', weak: true },
  { pattern: /handbags?, wallets/, women: 'bags', weak: true },
  { pattern: /clothing accessories/, women: 'accessories', weak: true },

  // Shoes
  { pattern: /\b(ankle boots?|bottines?|boots courtes)\b/, women: 'shoes/boots/ankle-boots' },
  { pattern: /\bchelsea\b/, women: 'shoes/boots/chelsea-boots' },
  { pattern: /\b(knee[- ]high|cuissardes?)\b/, women: 'shoes/boots/knee-high-boots' },
  { pattern: /\b(combat|rangers?)\b.*\bboots?\b|\bboots?\b.*\b(combat|rangers?)\b/, women: 'shoes/boots/combat-boots' },
  { pattern: /\b(cowboy|santiags?)\b/, women: 'shoes/boots/cowboy-boots' },
  { pattern: /\b(rain boots?|bottes de pluie|wellington)\b/, women: 'shoes/boots/rain-boots' },
  { pattern: /\b(boots?|bottes?)\b/, women: 'shoes/boots' },
  { pattern: /\b(sneakers?|trainers?|baskets?|running)\b/, women: 'shoes/sneakers-trainers' },
  { pattern: /\b(slides?|claquettes?)\b/, women: 'shoes/sandals/slides' },
  { pattern: /\b(sandals?|sandales?|mules?|tongs?|flip[- ]?flops?|espadrilles?)\b/, women: 'shoes/sandals' },
  { pattern: /\b(wedges?|compensees?)\b/, women: 'shoes/heels-pumps/wedges' },
  { pattern: /\b(heels?|pumps?|escarpins?|talons?|stilettos?|slingbacks?|decolletes?)\b/, women: 'shoes/heels-pumps' },
  { pattern: /\b(ballet|ballerinas?|ballerines?)\b/, women: 'shoes/flat-shoes/ballet-flats' },
  { pattern: /\b(loafers?|mocassins?|moccasins?)\b/, women: 'shoes/flat-shoes/loafers' },
  { pattern: /\b(lace[- ]?ups?|derb(y|ies)|oxfords?|brogues?|richelieus?)\b/, women: 'shoes/flat-shoes/lace-ups' },
  { pattern: /\b(slippers?|chaussons?)\b/, women: 'shoes/flat-shoes/slippers' },
  { pattern: /\b(flats?|boat ?shoes?|slip[- ]ons?|clogs?|sabots?)\b/, women: 'shoes/flat-shoes' },
  { pattern: /\b(shoes?|chaussures?|footwear)\b/, women: 'shoes', weak: true },

  // Bags
  { pattern: /\b(backpacks?|sacs? a dos|rucksacks?)\b/, women: 'bags/backpacks' },
  { pattern: /\b(belt bags?|bum bags?|fanny packs?|sacs? banane|bananes?)\b/, women: 'bags/belt-bags' },
  { pattern: /\b(clutch(es)?|pochettes?|pouch(es)?|minaudieres?|evening bags?)\b/, women: 'bags/clutch-evening-bags' },
  { pattern: /\b(totes?|cabas|shoppers?|shopping bags?)\b/, women: 'bags/shoulder-bags/tote-bags' },
  { pattern: /\b(cross[- ]?body|bandouliere|messenger|besaces?)\b/, women: 'bags/shoulder-bags/crossbody-bags' },
  { pattern: /\b(bucket bags?|sacs? seau)\b/, women: 'bags/shoulder-bags/bucket-bags' },
  { pattern: /\b(luggage|suitcases?|valises?|bagages?|weekend(er)? bags?|holdalls?|duffle bags?|travel bags?|sacs? de voyage)\b/, women: 'bags/luggage-travel' },
  { pattern: /\b(top[- ]handle|sacs? a main|handbags?)\b/, women: 'bags/top-handle-bags' },
  { pattern: /\b(shoulder bags?|sacs? (porte )?epaule|sacs? d'epaule)\b/, women: 'bags/shoulder-bags' },
  { pattern: /\b(bags?|sacs?)\b/, women: 'bags', weak: true },

  // Accessories
  { pattern: /\b(card ?holders?|card cases?|porte[- ]?cartes?)\b/, women: 'accessories/wallets-card-cases/card-holders' },
  { pattern: /\b(wallets?|portefeuilles?|purses?|porte[- ]?monnaie)\b/, women: 'accessories/wallets-card-cases/wallets' },
  { pattern: /\b(belts?|ceintures?)\b/, women: 'accessories/belts' },
  { pattern: /\b(scar(f|ves)|echarpes?|foulards?|etoles?|shawls?|stoles?)\b/, women: 'accessories/scarves-wraps' },
  { pattern: /\b(sunglasses|lunettes|eyewear)\b/, women: 'accessories/sunglasses' },
  { pattern: /\b(watch(es)?|montres?)\b/, women: 'accessories/watches' },
  { pattern: /\b(gloves?|gants?|mittens?|moufles?)\b/, women: 'accessories/hats-gloves/gloves' },
  { pattern: /\b(hats?|caps?|beanies?|bonnets?|casquettes?|chapeaux?|bobs?|berets?|balaclavas?|cagoules?|headwear)\b/, women: 'accessories/hats-gloves/hats' },
  { pattern: /\b(necklaces?|colliers?|pendants?|pendentifs?)\b/, women: 'accessories/jewelry/necklaces' },
  { pattern: /\b(earrings?|boucles d'oreilles?)\b/, women: 'accessories/jewelry/earrings' },
  { pattern: /\bbracelets?\b/, women: 'accessories/jewelry/bracelets' },
  { pattern: /\b(rings?|bagues?)\b/, women: 'accessories/jewelry/rings' },
  { pattern: /\b(brooch(es)?|broches?)\b/, women: 'accessories/jewelry/brooches' },
  { pattern: /\b(jewel(le)?ry|bijoux?)\b/, women: 'accessories/jewelry' },
  { pattern: /\b(hair|cheveux|barrettes?|headbands?|bandeaux?)\b/, women: 'accessories/hair-accessories' },
  { pattern: /\b(phone cases?|coques?|key ?(chains?|rings?)|porte[- ]?cles)\b/, women: 'accessories/tech-accessories' },

  // Clothing
  { pattern: /\b(jumpsuits?|playsuits?|combinaisons?|combishorts?|rompers?)\b/, women: 'women/jumpsuits-playsuits', men: 'men' },
  { pattern: /\b(mini dress(es)?|robes? courtes?)\b/, women: 'women/dresses/mini-dresses', men: 'men' },
  { pattern: /\b(midi dress(es)?|robes? mi[- ]longues?)\b/, women: 'women/dresses/midi-dresses', men: 'men' },
  { pattern: /\b(maxi dress(es)?|robes? longues?)\b/, women: 'women/dresses/maxi-dresses', men: 'men' },
  { pattern: /\b(gowns?)\b/, women: 'women/dresses/evening-gowns', men: 'men' },
  { pattern: /\b(dress(es)?|robes?)\b/, women: 'women/dresses', men: 'men' },
  { pattern: /\b(mini skirts?|jupes? courtes?)\b/, women: 'women/skirts/mini-skirts', men: 'men' },
  { pattern: /\b(midi skirts?)\b/, women: 'women/skirts/midi-skirts', men: 'men' },
  { pattern: /\b(maxi skirts?|jupes? longues?)\b/, women: 'women/skirts/maxi-skirts', men: 'men' },
  { pattern: /\b(skirts?|jupes?|kilts?)\b/, women: 'women/skirts', men: 'men' },
  { pattern: /\b(bikinis?)\b/, women: 'women/swimwear/bikinis', men: 'men' },
  { pattern: /\b(swim(wear|suits?)?|maillots? de bain|beachwear|swim shorts?)\b/, women: 'women/swimwear', men: 'men/trousers-shorts/shorts' },
  { pattern: /\b(bras?|bralettes?|soutiens?[- ]gorge)\b/, women: 'women/lingerie-loungewear/bras-bralettes', men: 'men' },
  { pattern: /\b(lingerie|nightwear|loungewear|pyjamas?|pajamas?|underwear|sous[- ]vetements?|briefs?|culottes?|boxers?|socks?|chaussettes?|tights|collants?|robes? de chambre)\b/, women: 'women/lingerie-loungewear', men: 'men' },
  { pattern: /\b(denim jackets?|vestes? en jean)\b/, women: 'women/jeans-denim/denim-jackets', men: 'men/outerwear/jackets' },
  { pattern: /\b(jeans?|denim)\b/, women: 'women/jeans-denim', men: 'men/jeans-denim/jeans' },
  { pattern: /\b(waistcoats?|gilets? de costume)\b/, women: 'women/suits-tailoring/waistcoats', men: 'men/suits-tailoring/waistcoats' },
  { pattern: /\b(blazers?)\b/, women: 'women/outerwear/blazers', men: 'men/outerwear/blazers' },
  { pattern: /\b(suits?|costumes?|tailleurs?|tailoring)\b/, women: 'women/suits-tailoring', men: 'men/suits-tailoring' },
  { pattern: /\b(trench(es)?)\b/, women: 'women/outerwear/trench-coats', men: 'men/outerwear/coats' },
  { pattern: /\b(puffers?|down jackets?|doudounes?|quilted jackets?)\b/, women: 'women/outerwear/puffer-down-jackets', men: 'men/outerwear/puffer-down-jackets' },
  { pattern: /\b(leather jackets?|vestes? en cuir|perfectos?|bikers?)\b/, women: 'women/outerwear/leather-jackets', men: 'men/outerwear/jackets' },
  { pattern: /\b(capes?|ponchos?)\b/, women: 'women/outerwear/capes-ponchos', men: 'men/outerwear' },
  { pattern: /\b(coats?|manteaux?|parkas?|overcoats?)\b/, women: 'women/outerwear/coats', men: 'men/outerwear/coats' },
  { pattern: /\b(gilets?|vests?)\b/, women: 'women/outerwear/gilets-vests', men: 'men/outerwear/gilets-vests' },
  { pattern: /\b(jackets?|vestes?|blousons?|bombers?|overshirts?|surchemises?)\b/, women: 'women/outerwear/jackets', men: 'men/outerwear/jackets' },
  { pattern: /\b(cardigans?)\b/, women: 'women/knitwear/cardigans', men: 'men/knitwear/cardigans' },
  { pattern: /\b(turtlenecks?|roll[- ]?necks?|cols? roules?)\b/, women: 'women/knitwear/turtlenecks', men: 'men/knitwear/turtlenecks' },
  { pattern: /\b(hoodies?|sweatshirts?|sweats?)\b/, women: 'women/tops/sweatshirts-hoodies', men: 'men/tops/sweatshirts-hoodies' },
  { pattern: /\b(sweaters?|jumpers?|pulls?|pullovers?|knitwear|knits?|mailles?|tricots?|cashmere|cachemire)\b/, women: 'women/knitwear/sweaters', men: 'men/knitwear/sweaters' },
  { pattern: /\b(polos?)\b/, women: 'women/tops', men: 'men/tops/polo-shirts' },
  { pattern: /\b(t[- ]?shirts?|tees?)\b/, women: 'women/tops/t-shirts', men: 'men/tops/t-shirts' },
  { pattern: /\b(blouses?)\b/, women: 'women/tops/blouses', men: 'men/tops/shirts' },
  { pattern: /\b(shirts?|chemises?|chemisiers?)\b/, women: 'women/tops/shirts', men: 'men/tops/shirts' },
  { pattern: /\b(bodysuits?|bodys?)\b/, women: 'women/tops/bodysuits', men: 'men/tops' },
  { pattern: /\b(tanks?|camis?|camisoles?|debardeurs?)\b/, women: 'women/tops/tanks-camis', men: 'men/tops' },
  { pattern: /\b(crop tops?)\b/, women: 'women/tops/crop-tops', men: 'men/tops' },
  { pattern: /\b(shorts?|bermudas?)\b/, women: 'women/trousers-shorts/shorts', men: 'men/trousers-shorts/shorts' },
  { pattern: /\b(leggings?)\b/, women: 'women/trousers-shorts/leggings', men: 'men/trousers-shorts/trousers' },
  { pattern: /\b(chinos?)\b/, women: 'women/trousers-shorts', men: 'men/trousers-shorts/chinos' },
  { pattern: /\b(trousers?|pants?|pantalons?|joggers?|joggings?|cargos?|sweatpants?)\b/, women: 'women/trousers-shorts', men: 'men/trousers-shorts/trousers' },
  { pattern: /\b(tops?|hauts?)\b/, women: 'women/tops', men: 'men/tops' },
  { pattern: /\b(activewear|sportswear|sport)\b/, women: 'women/activewear', men: 'men', weak: true },
  { pattern: /\b(accessories|accessoires?)\b/, women: 'accessories', weak: true },
];

/**
 * Maps merchant category text to a taxonomy path.
 * `categorySegments` go from the merchant's broadest level to its most specific one; the most
 * specific level is tried first, then the product name, then the affiliate network's own
 * category (`networkSegments`), which is the least precise of the three.
 */
export function inferCategoryPath(
  categorySegments: string[],
  name: string,
  gender: FeedGender,
  networkSegments: string[] = [],
): string {
  const department = gender === 'MALE' ? 'men' : 'women';
  // "Wool coat with belt" is a coat: what follows "with" describes a detail, not the product
  const mainName = name.split(/\s(?:with|avec|à ceinture)\s?/i)[0];
  const texts = [...categorySegments].reverse().concat(mainName, [...networkSegments].reverse()).map(fold);
  let weakMatch: string | null = null;

  for (const text of texts) {
    for (const rule of CATEGORY_RULES) {
      if (!rule.pattern.test(text)) continue;
      const path = gender === 'MALE' ? (rule.men ?? rule.women) : rule.women;
      if (!rule.weak) return path;
      weakMatch ??= path;
      break;
    }
  }

  return weakMatch ?? department;
}

/** Walks up the taxonomy until an existing path is found */
export function resolveExistingPath(path: string, knownPaths: Set<string>): string | null {
  let current = path;
  while (current) {
    if (knownPaths.has(current)) return current;
    current = current.includes('/') ? current.slice(0, current.lastIndexOf('/')) : '';
  }
  return null;
}

/** Builds one catalogue product from the feed rows that belong to the same style */
export function buildFeedProduct(input: {
  source: FeedSourceName;
  merchantId: string;
  merchantName: string;
  groupId: string;
  name: string;
  description: string | null;
  brand: string | null;
  genderRaw: string | null;
  categorySegments: string[];
  /** The affiliate network's generic category, used as a last resort */
  networkSegments?: string[];
  blackFriday: boolean;
  variants: FeedVariant[];
}): FeedProduct {
  const networkSegments = input.networkSegments ?? [];
  const rawCategory = (input.categorySegments.length > 0 ? input.categorySegments : networkSegments).join(' > ');
  const gender = normalizeGender(input.genderRaw, [...input.categorySegments, ...networkSegments].join(' '));
  const externalId = `${input.merchantId}:${input.groupId}`;

  return {
    source: input.source,
    merchantId: input.merchantId,
    merchantName: input.merchantName,
    externalId,
    groupId: input.groupId,
    name: input.name,
    slug: buildProductSlug(input.brand, input.name, input.source, externalId),
    description: input.description,
    brand: input.brand,
    gender,
    categoryPath: inferCategoryPath(input.categorySegments, input.name, gender, networkSegments),
    rawCategory,
    searchTags: input.blackFriday ? [BLACK_FRIDAY_TAG] : [],
    variants: input.variants,
  };
}
