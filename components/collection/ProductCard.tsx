import Image from 'next/image';
import Link from 'next/link';
import ProductPrice from '@/components/shared/product/product-price';
import { Badge } from '@/components/ui/badge';
import { CollectionProduct } from '@/lib/actions/collection';

type ProductCardProps = {
  product: CollectionProduct;
};

const getProductImages = (product: CollectionProduct) => {
  const variant = product.variants[0];
  const images = [
    ...(product.images ?? []),
    product.imageUrl,
    ...(variant?.images ?? []),
    variant?.imageUrl,
    '/images/logo.svg',
  ].filter((image): image is string => Boolean(image));

  return [images[0], images[1] ?? images[0]];
};

const getDiscountPercent = (price: number, compareAtPrice?: number) => {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
};

const ProductCard = ({ product }: ProductCardProps) => {
  const variant = product.variants[0];
  const [primaryImage, secondaryImage] = getProductImages(product);
  const price = Number(variant?.price ?? product.price);
  const compareAtPrice = variant?.compareAtPrice ? Number(variant.compareAtPrice) : null;
  const discountPercent = getDiscountPercent(price, compareAtPrice ?? undefined);
  const currency = variant?.currency ?? product.currency;

  return (
    <article className="group min-w-0">
      <Link href={`/products/${product.slug}`} className="block" aria-label={product.name}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
          <Image
            src={primaryImage}
            alt={product.name}
            width={480}
            height={640}
            className="h-full w-full object-cover transition duration-300 group-hover:opacity-0"
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          />
          <Image
            src={secondaryImage}
            alt={product.name}
            width={480}
            height={640}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100"
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          />
          {discountPercent ? (
            <Badge className="absolute left-2 top-2 rounded-md">-{discountPercent}%</Badge>
          ) : null}
        </div>
      </Link>
      <div className="mt-3 space-y-1">
        {product.brand ? (
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        ) : null}
        <Link href={`/products/${product.slug}`} className="block">
          <h2 className="line-clamp-2 text-sm font-medium leading-5 hover:underline">{product.name}</h2>
        </Link>
        <div className="flex flex-wrap items-baseline gap-2">
          <ProductPrice value={price} currency={currency} className="text-base font-semibold" />
          {compareAtPrice && compareAtPrice > price ? (
            <span className="text-sm text-muted-foreground line-through">
              {new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(compareAtPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;