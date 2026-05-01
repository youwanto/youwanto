'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, Check } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type SortOption = 'newest' | 'price_asc' | 'price_desc';

const sortLabels: Record<SortOption, string> = {
  newest: 'Newest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

type SortBarProps = {
  total: number;
  sort: SortOption;
};

const SortBar = ({ total, sort }: SortBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateSort = (nextSort: SortOption) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', nextSort);
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <p className="text-sm text-muted-foreground">{total.toLocaleString('en-GB')} items</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 min-w-44 justify-between">
            <ArrowUpDown className="size-4" />
            <span>{sortLabels[sort]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {(Object.keys(sortLabels) as SortOption[]).map((option) => (
            <DropdownMenuItem key={option} onClick={() => updateSort(option)}>
              {sort === option ? <Check className="size-4" /> : <span className="size-4" />}
              {sortLabels[option]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SortBar;