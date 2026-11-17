import { SERVER_URL } from '@/lib/constants';
import type { ProductDetail } from '@/lib/actions/product';

export const absoluteUrl = (path: string) => new URL(path, SERVER_URL).toString();

// Serialise JSON-LD safely for embedding in a <script> tag
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

type BreadcrumbEntry = { label: string; href?: string };

export function buildBreadcrumbJsonLd(items: BreadcrumbEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export function buildProductJsonLd(product: ProductDetail) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const images = [product.imageUrl, ...(product.images ?? [])].filter((image): image is string => Boolean(image));
  const inStockVariants = product.variants.filter((variant) => variant.inStock);
  const pricedVariants = (inStockVariants.length > 0 ? inStockVariants : product.variants).filter(
    (variant) => Number(variant.price) > 0
  );
  const prices = pricedVariants.map((variant) => Number(variant.price));
  const currency = pricedVariants[0]?.currency || product.currency;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    ...(images.length > 0 ? { image: [...new Set(images)] } : {}),
    ...(product.description ? { description: product.description.slice(0, 5000) } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.ean ? { gtin: product.ean } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...(prices.length > 0
      ? {
          offers: {
            '@type': 'AggregateOffer',
            url,
            priceCurrency: currency,
            lowPrice: Math.min(...prices).toFixed(2),
            highPrice: Math.max(...prices).toFixed(2),
            offerCount: pricedVariants.length,
            availability:
              inStockVariants.length > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition:
              product.condition === 'NEW'
                ? 'https://schema.org/NewCondition'
                : product.condition === 'REFURBISHED'
                  ? 'https://schema.org/RefurbishedCondition'
                  : 'https://schema.org/UsedCondition',
          },
        }
      : {}),
  };
}
