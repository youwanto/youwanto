'use client';

import { Button } from '@/components/ui/button';
import { CollectionQuery } from '@/lib/actions/collection';
import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type ActiveFiltersProps = {
  query: CollectionQuery;
};

type FilterPill = {
  key: string;
  value?: string;
  label: string;
};

const filterKeys = ['colors', 'sizes', 'materials', 'brands', 'minPrice', 'maxPrice', 'inStock', 'inStockOnly', 'page'];

const ActiveFilters = ({ query }: ActiveFiltersProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pills: FilterPill[] = [
    ...query.colors.map((value) => ({ key: 'colors', value, label: value })),
    ...query.sizes.map((value) => ({ key: 'sizes', value, label: value })),
    ...query.materials.map((value) => ({ key: 'materials', value, label: value })),
    ...query.brands.map((value) => ({ key: 'brands', value, label: value })),
    ...(query.minPrice !== undefined ? [{ key: 'minPrice', label: `Over £${query.minPrice}` }] : []),
    ...(query.maxPrice !== undefined ? [{ key: 'maxPrice', label: `Under £${query.maxPrice}` }] : []),
    ...(query.inStock ? [{ key: 'inStock', label: 'In stock' }] : []),
  ];

  const replaceParams = (params: URLSearchParams) => {
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const removeFilter = (pill: FilterPill) => {
    const params = new URLSearchParams(searchParams.toString());

    if (pill.value) {
      const nextValues = params.getAll(pill.key).filter((value) => value !== pill.value);
      params.delete(pill.key);
      nextValues.forEach((value) => params.append(pill.key, value));
    } else {
      params.delete(pill.key);
      if (pill.key === 'inStock') params.delete('inStockOnly');
    }

    params.delete('page');
    replaceParams(params);
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    filterKeys.forEach((key) => params.delete(key));
    replaceParams(params);
  };

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <Button
          key={`${pill.key}-${pill.value ?? pill.label}`}
          variant="secondary"
          size="sm"
          className="h-8 rounded-md px-2 text-xs"
          onClick={() => removeFilter(pill)}
        >
          {pill.label}
          <X className="size-3" />
        </Button>
      ))}
      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearAll}>
        Clear all
      </Button>
    </div>
  );
};

export default ActiveFilters;