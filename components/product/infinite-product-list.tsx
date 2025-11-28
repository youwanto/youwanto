"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Product } from "@/types";
import ProductCard from "@/components/shared/product/product-card";

type Props = {
  initialProducts: Product[];
  initialCursor: string | null;
};

// Simple shuffle function to randomize products (optional)
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const InfiniteProductList = ({ initialProducts, initialCursor }: Props) => {
  const [products, setProducts] = useState<Product[]>(() => shuffle(initialProducts));
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialCursor);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/products?cursor=${cursor}`);
      const data = (await res.json()) as {
        items: Product[];
        nextCursor: string | null;
      };

      const shuffled = shuffle(data.items);

      setProducts((prev) => [...prev, ...shuffled]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  // observer now integrates cleanly
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore]); // loadMore is safe now

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {loading && (
        <p className="mt-4 text-center text-muted-foreground text-sm">
          Loading more…
        </p>
      )}

      {!hasMore && (
        <p className="mt-4 text-center text-muted-foreground text-sm">
          No more products
        </p>
      )}

      {/* Sentinel element to trigger loading more products */}
      <div ref={sentinelRef} className="h-1" />
    </>
  );
};

export default InfiniteProductList;
