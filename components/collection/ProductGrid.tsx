import ActiveFilters from '@/components/collection/ActiveFilters';
import Pagination from '@/components/collection/Pagination';
import ProductCard from '@/components/collection/ProductCard';
import SortBar from '@/components/collection/SortBar';
import { CollectionProduct, CollectionQuery } from '@/lib/actions/collection';

type ProductGridProps = {
  products: CollectionProduct[];
  query: CollectionQuery;
  total: number;
  page: number;
  totalPages: number;
};

const ProductGrid = ({ products, query, total, page, totalPages }: ProductGridProps) => {
  return (
    <section className="min-w-0 space-y-5">
      <SortBar total={total} sort={query.sort} />
      <ActiveFilters query={query} />
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No products match these filters.
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} query={query} />
    </section>
  );
};

export default ProductGrid;