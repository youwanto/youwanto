'use client';

import { Badge } from '@/components/ui/badge';
import { ProductDetailVariant } from '@/lib/actions/product';

type PriceBlockProps = {
  variant: ProductDetailVariant | null;
  showFrom?: boolean;
};

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
};

const PriceBlock = ({ variant, showFrom }: PriceBlockProps) => {
  if (!variant) {
    return <p className="text-sm text-muted-foreground">Price unavailable</p>;
  }

  const price = Number(variant.price);
  const compareAtPrice = variant.compareAtPrice ? Number(variant.compareAtPrice) : null;
  const currency = variant.currency || 'GBP';
  const discountPct = compareAtPrice && compareAtPrice > price ? Math.round((1 - price / compareAtPrice) * 100) : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-2xl font-semibold tracking-normal">
        {showFrom ? 'from ' : ''}
        {formatCurrency(price, currency)}
      </span>
      {compareAtPrice && compareAtPrice > price ? (
        <span className="text-sm text-muted-foreground line-through">{formatCurrency(compareAtPrice, currency)}</span>
      ) : null}
      {discountPct ? <Badge className="rounded-md">-{discountPct}%</Badge> : null}
    </div>
  );
};

export default PriceBlock;