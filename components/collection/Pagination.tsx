import { Button } from '@/components/ui/button';
import { CollectionQuery } from '@/lib/actions/collection';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type PaginationProps = {
  page: number;
  totalPages: number;
  query: CollectionQuery;
};

const appendArray = (params: URLSearchParams, key: string, values: string[]) => {
  values.forEach((value) => params.append(key, value));
};

const createHref = (query: CollectionQuery, page: number) => {
  const params = new URLSearchParams();

  appendArray(params, 'colors', query.colors);
  appendArray(params, 'sizes', query.sizes);
  appendArray(params, 'materials', query.materials);
  appendArray(params, 'brands', query.brands);
  if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice));
  if (query.inStock) params.set('inStock', 'true');
  if (query.sort !== 'newest') params.set('sort', query.sort);
  if (page > 1) params.set('page', String(page));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '?';
};

const getPageNumbers = (page: number, totalPages: number) => {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const Pagination = ({ page, totalPages, query }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 pt-4" aria-label="Pagination">
      <Button asChild variant="outline" size="sm" className={page === 1 ? 'pointer-events-none opacity-50' : ''}>
        <Link href={createHref(query, Math.max(1, page - 1))} aria-label="Previous page">
          <ChevronLeft className="size-4" />
          Previous
        </Link>
      </Button>
      {pages.map((pageNumber) => (
        <Button key={pageNumber} asChild variant={pageNumber === page ? 'default' : 'outline'} size="sm">
          <Link href={createHref(query, pageNumber)} aria-current={pageNumber === page ? 'page' : undefined}>
            {pageNumber}
          </Link>
        </Button>
      ))}
      <Button asChild variant="outline" size="sm" className={page === totalPages ? 'pointer-events-none opacity-50' : ''}>
        <Link href={createHref(query, Math.min(totalPages, page + 1))} aria-label="Next page">
          Next
          <ChevronRight className="size-4" />
        </Link>
      </Button>
    </nav>
  );
};

export default Pagination;