'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CollectionQuery, FacetCounts } from '@/lib/actions/collection';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type FacetSidebarProps = {
  facets: FacetCounts;
  query: CollectionQuery;
};

type FacetKey = 'colors' | 'sizes' | 'materials' | 'brands';

type FacetGroupProps = {
  title: string;
  name: FacetKey;
  values: { value: string; count: number }[];
  selected: string[];
  defaultOpen?: boolean;
  onToggle: (name: FacetKey, value: string) => void;
};

const FacetGroup = ({ title, name, values, selected, defaultOpen, onToggle }: FacetGroupProps) => {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  if (values.length === 0) return null;

  return (
    <div className="border-b py-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-semibold"
        onClick={() => setOpen((current) => !current)}
      >
        {title}
        <ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="mt-3 space-y-2">
          {values.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => onToggle(name, option.value)}
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="truncate">{option.value}</span>
              </span>
              <span className="text-xs text-muted-foreground">{option.count}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const FacetSidebar = ({ facets, query }: FacetSidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(String(query.minPrice ?? Math.floor(facets.priceRange.min)));
  const [maxPrice, setMaxPrice] = useState(String(query.maxPrice ?? Math.ceil(facets.priceRange.max)));

  const replaceParams = (params: URLSearchParams) => {
    params.delete('page');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const toggleFacet = (name: FacetKey, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const values = params.getAll(name);
    const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

    params.delete(name);
    nextValues.forEach((item) => params.append(name, item));
    replaceParams(params);
  };

  const toggleInStock = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (query.inStock) {
      params.delete('inStock');
      params.delete('inStockOnly');
    } else {
      params.set('inStock', 'true');
    }
    replaceParams(params);
  };

  const applyPriceRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    const nextMin = Number(minPrice);
    const nextMax = Number(maxPrice);

    if (Number.isFinite(nextMin) && nextMin > 0) {
      params.set('minPrice', String(nextMin));
    } else {
      params.delete('minPrice');
    }

    if (Number.isFinite(nextMax) && nextMax > 0) {
      params.set('maxPrice', String(nextMax));
    } else {
      params.delete('maxPrice');
    }

    replaceParams(params);
  };

  const sidebarContent = (
    <div className="space-y-1">
      <FacetGroup title="Colors" name="colors" values={facets.colors} selected={query.colors} defaultOpen onToggle={toggleFacet} />
      <FacetGroup title="Sizes" name="sizes" values={facets.sizes} selected={query.sizes} defaultOpen onToggle={toggleFacet} />
      <FacetGroup title="Materials" name="materials" values={facets.materials} selected={query.materials} defaultOpen onToggle={toggleFacet} />
      <FacetGroup title="Brands" name="brands" values={facets.brands} selected={query.brands} onToggle={toggleFacet} />
      <div className="border-b py-4">
        <p className="text-sm font-semibold">Price</p>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              Min
              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Max
              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              />
            </label>
          </div>
          <div className="space-y-2">
            <input
              type="range"
              min={Math.floor(facets.priceRange.min)}
              max={Math.ceil(facets.priceRange.max || 1)}
              value={Number(minPrice) || 0}
              onChange={(event) => setMinPrice(event.target.value)}
              className="w-full accent-primary"
            />
            <input
              type="range"
              min={Math.floor(facets.priceRange.min)}
              max={Math.ceil(facets.priceRange.max || 1)}
              value={Number(maxPrice) || 0}
              onChange={(event) => setMaxPrice(event.target.value)}
              className="w-full accent-primary"
            />
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={applyPriceRange}>
            Apply price
          </Button>
        </div>
      </div>
      <button type="button" onClick={toggleInStock} className="flex w-full items-center gap-2 py-4 text-sm">
        <input type="checkbox" checked={query.inStock} readOnly className="size-4 rounded border-input accent-primary" />
        In stock only
      </button>
    </div>
  );

  return (
    <aside className="lg:w-60 lg:shrink-0">
      <div className="mb-4 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontal className="size-4" />
              Filter
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-lg px-4 pb-6 pt-2">
            <SheetHeader className="px-0">
              <SheetTitle>Filter</SheetTitle>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>
      <div className="hidden lg:sticky lg:top-6 lg:block">{sidebarContent}</div>
    </aside>
  );
};

export default FacetSidebar;