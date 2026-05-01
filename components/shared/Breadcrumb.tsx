import Link from 'next/link';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-foreground">
        Home
      </Link>
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1 || !item.href;
        const href = item.href;

        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
            <span>/</span>
            {isCurrent ? (
              <span className="truncate text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : href ? (
              <Link href={href} className="truncate hover:text-foreground">
                {item.label}
              </Link>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;