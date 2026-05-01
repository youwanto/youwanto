'use client';

import BuyButton from '@/components/pdp/BuyButton';
import ImageGallery from '@/components/pdp/ImageGallery';
import PriceBlock from '@/components/pdp/PriceBlock';
import VariantSelector from '@/components/pdp/VariantSelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductDetail, ProductDetailVariant } from '@/lib/actions/product';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

type ProductDetailClientProps = {
  product: ProductDetail;
};

const getLowestVariant = (variants: ProductDetailVariant[]) => variants.find((variant) => variant.inStock) ?? variants[0] ?? null;

const ProductDetailClient = ({ product }: ProductDetailClientProps) => {
  const baseImages = useMemo(
    () => [...(product.images ?? []), product.imageUrl].filter((image): image is string => Boolean(image)),
    [product.imageUrl, product.images]
  );
  const lowestVariant = useMemo(() => getLowestVariant(product.variants), [product.variants]);
  const [previewVariant, setPreviewVariant] = useState<ProductDetailVariant | null>(lowestVariant);
  const [selectedVariant, setSelectedVariant] = useState<ProductDetailVariant | null>(null);
  const [hasColorSelection, setHasColorSelection] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const hasSizeOptions = product.variants.some((variant) => Boolean(variant.size?.trim()));
  const displayVariant = selectedVariant ?? previewVariant ?? lowestVariant;
  const buyVariant = selectedVariant ?? (!hasSizeOptions ? displayVariant : null);
  const displayImage = displayVariant?.imageUrl || displayVariant?.images?.[0] || baseImages[0] || '/images/logo.svg';
  const stockLabel = !displayVariant?.inStock
    ? 'Out of stock'
    : (displayVariant.stockQty ?? 0) > 0 && (displayVariant.stockQty ?? 0) <= 3
      ? `Low stock: ${displayVariant.stockQty} left`
      : 'In stock';
  const metaTags = Array.from(
    new Set([
      ...product.materials,
      product.brand,
      product.condition ? product.condition.toLowerCase() : null,
      product.ean ? `EAN ${product.ean}` : null,
    ].filter((value): value is string => Boolean(value)))
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-start">
      <ImageGallery images={baseImages} selectedImageUrl={selectedVariant?.imageUrl ?? selectedVariant?.images?.[0]} alt={product.name} />
      <section className="space-y-7 lg:sticky lg:top-6">
        <div className="space-y-3">
          {product.brand ? <p className="text-xs font-semibold uppercase text-muted-foreground">{product.brand}</p> : null}
          <h1 className="h1-bold leading-tight">{product.name}</h1>
          <PriceBlock variant={displayVariant} showFrom={!selectedVariant && !hasColorSelection} />
        </div>

        <VariantSelector
          variants={product.variants}
          onPreviewVariantChange={(variant) => setPreviewVariant(variant ?? lowestVariant)}
          onSelectedVariantChange={setSelectedVariant}
          onColorSelectionChange={setHasColorSelection}
        />

        <div className="flex items-center justify-between rounded-md border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Availability</span>
          <Badge variant={displayVariant?.inStock ? 'outline' : 'destructive'} className="rounded-md">
            {stockLabel}
          </Badge>
        </div>

        <BuyButton product={product} variant={buyVariant} image={displayImage} disabled={hasSizeOptions && !selectedVariant} />

        {product.description ? (
          <div className="space-y-3 border-t pt-6">
            <p className="text-sm font-semibold">Description</p>
            <p className={cn('text-sm leading-6 text-muted-foreground whitespace-pre-line', !descriptionOpen && 'line-clamp-3')}>
              {product.description}
            </p>
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => setDescriptionOpen((current) => !current)}>
              {descriptionOpen ? 'Read less' : 'Read more'}
            </Button>
          </div>
        ) : null}

        {metaTags.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t pt-6">
            {metaTags.map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-md capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default ProductDetailClient;