"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCatalogPrice } from "@/lib/catalog";
import { Product } from "@/types";
import ProductCard from "@/components/shared/product/product-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Props = {
  initialProducts: Product[];
  initialCursor: string | null;
  categories: { value: string; label: string }[];
  currency: string;
  brands: string[];
  priceRange: { min: number; max: number };
};

const InfiniteProductList = ({ initialProducts, initialCursor, categories, brands, priceRange, currency }: Props) => {
  const [products, setProducts] = useState<Product[]>(() => initialProducts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [priceMin, setPriceMin] = useState<number>(Math.floor(priceRange.min));
  const [priceMax, setPriceMax] = useState<number>(Math.ceil(priceRange.max));
  const [sortKey, setSortKey] = useState<string>("newest");

  const normalizedPrice = useMemo(() => {
    const min = Math.min(priceMin, priceMax);
    const max = Math.max(priceMin, priceMax);
    return { min, max };
  }, [priceMin, priceMax]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const generation = useRef(0);
  const moreRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ currency, sort: sortKey,
      minPrice: String(normalizedPrice.min), maxPrice: String(normalizedPrice.max) });
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedBrand !== 'All') params.set('brand', selectedBrand);
    return params.toString();
  }, [currency, sortKey, normalizedPrice.min, normalizedPrice.max, selectedCategory, selectedBrand]);

  const initialQueryString = useRef(queryString);

  const loadMore = useCallback(async () => {
    if (!cursor || loading || moreRequest.current) return;
    const controller = new AbortController();
    moreRequest.current = controller;
    const requestGeneration = generation.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(queryString);
      params.set('cursor', cursor);
      const res = await fetch(`/api/products?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Products could not be loaded. Please try again.');
      const data = await res.json() as { items: Product[]; nextCursor: string | null };
      if (requestGeneration !== generation.current) return;
      setProducts(prev => {
        const ids = new Set(prev.map(product => product.id));
        return [...prev, ...data.items.filter(product => !ids.has(product.id))];
      });
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      if (!controller.signal.aborted && requestGeneration === generation.current) {
        setError('Products could not be loaded. Please try again.');
      }
    } finally {
      if (moreRequest.current === controller) moreRequest.current = null;
      if (requestGeneration === generation.current) setLoading(false);
    }
  }, [cursor, loading, queryString]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || error || loading) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) void loadMore();
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, error, loading]);

  const activeFilters: string[] = [];
  if (selectedCategory !== "All") activeFilters.push(categories.find(category => category.value === selectedCategory)?.label ?? selectedCategory);
  if (selectedBrand !== "All") activeFilters.push(selectedBrand);
  if (
    normalizedPrice.min > priceRange.min ||
    normalizedPrice.max < priceRange.max
  ) {
    activeFilters.push(`${formatCatalogPrice(normalizedPrice.min, currency)}–${formatCatalogPrice(normalizedPrice.max, currency)}`);
  }

  const resetFilters = () => {
    setSelectedCategory("All");
    setSelectedBrand("All");
    setPriceMin(Math.floor(priceRange.min));
    setPriceMax(Math.ceil(priceRange.max));
    setSortKey("newest");
  };

  const showLoadMore = hasMore;

  const FilterPanel = (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Category</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[{ value: "All", label: "All" }, ...categories].map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setSelectedCategory(category.value)}
              className={
                category.value === selectedCategory
                  ? "rounded-full border border-foreground bg-foreground px-3 py-1 text-xs text-background"
                  : "rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-foreground/60 hover:text-foreground"
              }
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Brand</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["All", ...brands].map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => setSelectedBrand(brand)}
              className={
                brand === selectedBrand
                  ? "rounded-full border border-foreground bg-foreground px-3 py-1 text-xs text-background"
                  : "rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-foreground/60 hover:text-foreground"
              }
            >
              {brand}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Price range</p>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCatalogPrice(normalizedPrice.min, currency)}</span>
            <span>{formatCatalogPrice(normalizedPrice.max, currency)}</span>
          </div>
          <div className="relative h-8">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            <input
              type="range"
              aria-label="Minimum price"
              min={Math.floor(priceRange.min)}
              max={Math.ceil(priceRange.max)}
              value={priceMin}
              onChange={(event) => setPriceMin(Number(event.target.value))}
              className="pointer-events-auto absolute left-0 right-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent"
            />
            <input
              type="range"
              aria-label="Maximum price"
              min={Math.floor(priceRange.min)}
              max={Math.ceil(priceRange.max)}
              value={priceMax}
              onChange={(event) => setPriceMax(Number(event.target.value))}
              className="pointer-events-auto absolute left-0 right-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Reset filters
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    // SSR already supplied the first page for this exact initial query.
    if (generation.current === 0 && queryString === initialQueryString.current && retry === 0) return;
    const controller = new AbortController();
    const requestGeneration = ++generation.current;
    moreRequest.current?.abort();
    moreRequest.current = null;
    setLoading(true);
    setError(null);
    setHasMore(false);
    setProducts([]);
    setCursor(null);
    const fetchFiltered = async () => {
      try {
        const res = await fetch(`/api/products?${queryString}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Products could not be loaded. Please try again.');
        const data = await res.json() as { items: Product[]; nextCursor: string | null };
        if (controller.signal.aborted || requestGeneration !== generation.current) return;
        setProducts(data.items);
        setCursor(data.nextCursor);
        setHasMore(Boolean(data.nextCursor));
      } catch {
        if (!controller.signal.aborted && requestGeneration === generation.current) {
          setError('Products could not be loaded. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted && requestGeneration === generation.current) setLoading(false);
      }
    };
    void fetchFiltered();
    return () => { controller.abort(); moreRequest.current?.abort(); };
  }, [queryString, retry]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-card/60 p-4 md:grid-cols-[240px_1fr]">
        <div className="hidden md:block">{FilterPanel}</div>

        <div>
          {activeFilters.length > 0 && (
            <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                >
                  {filter}
                </span>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
            <Sheet>
              <SheetTrigger className="rounded-full border px-4 py-2 text-xs font-medium md:hidden">
                Filter
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-4">{FilterPanel}</div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <label htmlFor="catalog-sort" className="text-xs text-muted-foreground">Sort</label>
              <select
                id="catalog-sort"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value)}
                className="rounded-full border bg-background px-3 py-2 text-xs"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name-asc">Name A-Z</option>
              </select>
            </div>
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <span
                    key={filter}
                    className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                  >
                    {filter}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {products.length === 0 && !loading && !error && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              No products match these filters.
            </p>
          )}
        </div>
      </div>

      {loading && <p role="status" className="mt-4 text-center text-sm text-muted-foreground">Loading products…</p>}
      {error && <div role="alert" className="mt-4 text-center text-sm">
        <p>{error}</p>
        <button type="button" className="mt-2 underline" onClick={() => cursor ? void loadMore() : setRetry(value => value + 1)}>Try again</button>
      </div>}
      {!hasMore && !loading && !error && products.length > 0 && <p className="mt-4 text-center text-sm text-muted-foreground">No more products</p>}
      {showLoadMore && !error && <div ref={sentinelRef} className="h-1" />}
    </>
  );
};

export default InfiniteProductList;
