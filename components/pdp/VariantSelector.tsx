'use client';

import { cn } from '@/lib/utils';
import { ProductDetailVariant } from '@/lib/actions/product';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type VariantSelectorProps = {
  variants: ProductDetailVariant[];
  onPreviewVariantChange: (variant: ProductDetailVariant | null) => void;
  onSelectedVariantChange: (variant: ProductDetailVariant | null) => void;
  onColorSelectionChange: (hasColorSelection: boolean) => void;
};

const colorClasses: Record<string, string> = {
  black: 'bg-zinc-950',
  white: 'bg-white',
  cream: 'bg-stone-100',
  beige: 'bg-stone-300',
  brown: 'bg-amber-900',
  grey: 'bg-zinc-400',
  gray: 'bg-zinc-400',
  blue: 'bg-blue-600',
  navy: 'bg-blue-950',
  green: 'bg-emerald-700',
  red: 'bg-red-600',
  pink: 'bg-pink-400',
  purple: 'bg-purple-600',
  yellow: 'bg-yellow-300',
  orange: 'bg-orange-500',
};

const getColorName = (variant: ProductDetailVariant) => variant.color?.trim() || 'Standard';
const getSizeName = (variant: ProductDetailVariant) => variant.size?.trim() || 'One size';

const alphaSizeOrder = new Map([
  ['XXS', 0],
  ['XS', 1],
  ['S', 2],
  ['M', 3],
  ['L', 4],
  ['XL', 5],
  ['XXL', 6],
]);

const sizeCollator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });

const sortSizes = (left: string, right: string) => {
  const leftKey = left.toUpperCase();
  const rightKey = right.toUpperCase();
  const leftAlphaIndex = alphaSizeOrder.get(leftKey);
  const rightAlphaIndex = alphaSizeOrder.get(rightKey);

  if (leftAlphaIndex !== undefined && rightAlphaIndex !== undefined) return leftAlphaIndex - rightAlphaIndex;
  if (leftAlphaIndex !== undefined) return -1;
  if (rightAlphaIndex !== undefined) return 1;

  return sizeCollator.compare(left, right);
};

const getCheapestAvailableVariant = (variants: ProductDetailVariant[]) => {
  return variants.find((variant) => variant.inStock) ?? variants[0] ?? null;
};

const VariantSelector = ({
  variants,
  onPreviewVariantChange,
  onSelectedVariantChange,
  onColorSelectionChange,
}: VariantSelectorProps) => {
  const colors = useMemo(() => Array.from(new Set(variants.map(getColorName))), [variants]);
  const hasRealColors = colors.length > 1 || colors[0] !== 'Standard';
  const hasRealSizes = variants.some((variant) => Boolean(variant.size?.trim()));
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const scopedVariants = useMemo(() => {
    if (!selectedColor) return variants;
    return variants.filter((variant) => getColorName(variant) === selectedColor);
  }, [selectedColor, variants]);

  const sizeOptions = useMemo(() => {
    const source = selectedColor ? scopedVariants : variants;
    return Array.from(new Set(source.map(getSizeName))).sort(sortSizes);
  }, [scopedVariants, selectedColor, variants]);

  useEffect(() => {
    const previewVariant = selectedColor ? getCheapestAvailableVariant(scopedVariants) : null;
    const selectedVariant = selectedSize
      ? scopedVariants.find((variant) => getSizeName(variant) === selectedSize) ?? null
      : !hasRealSizes && selectedColor
        ? previewVariant
        : null;

    onPreviewVariantChange(previewVariant);
    onSelectedVariantChange(selectedVariant);
    onColorSelectionChange(Boolean(selectedColor));
  }, [hasRealSizes, onColorSelectionChange, onPreviewVariantChange, onSelectedVariantChange, scopedVariants, selectedColor, selectedSize]);

  if (variants.length === 0) return null;

  return (
    <div className="space-y-6">
      {hasRealColors ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Colour</p>
            {selectedColor ? <span className="text-xs text-muted-foreground">{selectedColor}</span> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              const colorVariants = variants.filter((variant) => getColorName(variant) === color);
              const hasStock = colorVariants.some((variant) => variant.inStock);
              const swatchClass = colorClasses[color.toLowerCase()] ?? 'bg-muted';

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    setSelectedSize(null);
                  }}
                  className={cn(
                    'relative flex size-10 items-center justify-center rounded-full border transition',
                    selectedColor === color ? 'border-foreground ring-2 ring-foreground ring-offset-2' : 'border-input hover:border-foreground',
                    !hasStock && 'opacity-50'
                  )}
                  aria-label={`Select ${color}`}
                >
                  <span className={cn('size-7 rounded-full border border-black/10', swatchClass)} />
                  {!hasStock ? <span className="absolute h-px w-10 rotate-45 bg-foreground" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasRealSizes ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Size</p>
            {selectedSize ? <span className="text-xs text-muted-foreground">{selectedSize}</span> : null}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {sizeOptions.map((size) => {
              const sizeVariant = scopedVariants.find((variant) => getSizeName(variant) === size);
              const isSelected = selectedSize === size;
              const disabled = !sizeVariant || !sizeVariant.inStock;

              return (
                <button
                  key={size}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-md border text-sm font-medium transition',
                    isSelected ? 'border-foreground bg-foreground text-background' : 'border-input hover:border-foreground',
                    disabled && 'cursor-not-allowed bg-muted text-muted-foreground line-through opacity-70'
                  )}
                >
                  {isSelected ? <Check className="mr-1 size-4" /> : null}
                  {size}
                </button>
              );
            })}
          </div>
          {hasRealColors && !selectedColor ? (
            <p className="text-xs text-muted-foreground">Choose a colour to narrow the available sizes.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default VariantSelector;