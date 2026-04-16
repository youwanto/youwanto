"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ProductPrice from "@/components/shared/product/product-price";
import { cn } from "@/lib/utils";

type VariantView = {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  inStock: boolean;
  stockQty: number;
  price: number;
  currency: string;
};

export function ProductVariantSelector({ variants }: { variants: VariantView[] }) {

    // all colors
    const colors = useMemo(() =>{
        if(!variants) return [];
        return Array.from(
            new Set(
                variants.map((v) =>(v.color && v.color.trim() !== "" ? v.color : "Default")
            ))
        );
     }, [variants]
    );
        
    const [selectedColor, setSelectedColor] = useState<string>(colors[0]?? null);
    const colorVariants = useMemo(() =>{
            if(!variants) return [];
            if(!selectedColor) return variants;
            return variants.filter((v) =>(v.color && v.color.trim() !== "" ? v.color : "Default") === selectedColor);
        },[variants, selectedColor]
    );

    // all sizes for the selected color
    const sizes = useMemo(() => {
            return colorVariants
            .filter((v) => v.size)
            .map((v) => v.size as string);
        }, [colorVariants]
    );
    
    // default to the first size available
    const [selectedSize, setSelectedSize] = useState<string | null>(
        sizes.length > 0 ? sizes[0] : null
    );

    const selectedVariant = useMemo(() => {
        if (colorVariants.length === 0) return null;

        if (selectedSize) {
            return colorVariants.find((v) => v.size === selectedSize) ?? colorVariants[0];
        }
        return colorVariants[0];
    }, [colorVariants, selectedSize]);

    // After hooks, now we can early-return safely
    if (!variants || variants.length === 0) return null;

    if (!selectedVariant) return null;

    const stockText =
        !selectedVariant.inStock || selectedVariant.stockQty <= 0
        ? "Sold out"
        : selectedVariant.stockQty === 1
        ? "Only 1 left"
        : selectedVariant.stockQty <= 3
        ? `Only ${selectedVariant.stockQty} left`
        : `${selectedVariant.stockQty} in stock`;

    return (
        <div className="mt-8 space-y-5">
            {/* Color */}
            <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                COLOR
                </p>
                <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => {
                                setSelectedColor(color);
                                // Reset size when changing color
                                const firstSize = colorVariants.find(
                                (v) => (v.color || "Default") === color && v.size
                                )?.size;
                                setSelectedSize(firstSize ?? null);
                            }}
                            className={cn(
                                "rounded-full border px-3 py-1 text-xs uppercase",
                                (color || "Default") === (selectedColor || "Default")
                                ? "border-foreground bg-foreground text-background"
                                : "border-muted-foreground/40 text-muted-foreground hover:border-foreground/60 hover:text-foreground"
                            )}
                        >
                            {color === "Default" ? "Standard" : color}
                        </button>
                    ))}
                </div>
            </div>

            {/* Size */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium tracking-wide">
                    <span className="text-muted-foreground">SIZE</span>
                    <span className="text-[11px] uppercase text-muted-foreground">
                        {stockText}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {sizes.length > 0 ? (
                        sizes.map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => setSelectedSize(size)}
                                className={cn(
                                    "h-9 w-9 rounded-full border text-xs font-medium",
                                    selectedSize === size
                                        ? "border-foreground bg-foreground text-background"
                                        : "border-muted-foreground/40 text-muted-foreground hover:border-foreground/60 hover:text-foreground"
                                )}
                            >
                                {size}
                            </button>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            No size information for this color.
                        </p>
                    )}
                </div>
            </div>

            {/* Selected variant price + SKU (small text) */}
            <div className="space-y-1 text-xs">
                <p className="font-mono text-[11px] text-muted-foreground">
                    SKU: {selectedVariant.sku}
                </p>
            </div>
        </div>
    );
}
