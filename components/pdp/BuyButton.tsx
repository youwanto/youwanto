'use client';

import { addItemToCart } from '@/lib/actions/cart.actions';
import { ProductDetail, ProductDetailVariant } from '@/lib/actions/product';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

type BuyButtonProps = {
  product: ProductDetail;
  variant: ProductDetailVariant | null;
  image: string;
  disabled?: boolean;
};

const BuyButton = ({ product, variant, image, disabled }: BuyButtonProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDisabled = disabled || !variant || !variant.inStock || isPending;

  const isPartnerProduct = Boolean(product.externalUrl || product.variants.some(item => item.deepLink));
  const partnerLink = variant?.deepLink || product.externalUrl;

  if (isPartnerProduct) {
    return (
      <div className="sticky bottom-0 z-30 -mx-5 border-t bg-background p-4 lg:static lg:mx-0 lg:border-0 lg:p-0">
        {isDisabled || !partnerLink ? (
          <Button className="h-11 w-full" disabled>
            Shop at partner store
            <ExternalLink className="size-4" />
          </Button>
        ) : (
          <Button asChild className="h-11 w-full">
            <a href={partnerLink} target="_blank" rel="noopener noreferrer nofollow sponsored">
              Shop at partner store
              <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {variant ? 'Complete your purchase on the retailer’s website. The retailer confirms price and availability.' : 'Select your options to continue to the retailer’s website.'}
        </p>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!variant) return;

    startTransition(async () => {
      const result = await addItemToCart({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        slug: product.slug,
        price: variant.price,
        currency: variant.currency || product.currency,
        quantity: 1,
        image,
        size: variant.size,
        color: variant.color,
      });

      if (!result.success) {
        toast.error(result.message || 'Failed to add item to cart.');
        return;
      }

      toast.success(`${product.name} added to the cart`, {
        action: {
          label: 'Go to cart',
          onClick: () => router.push('/cart'),
        },
      });
    });
  };

  return (
    <div className="sticky bottom-0 z-30 -mx-5 border-t bg-background p-4 lg:static lg:mx-0 lg:border-0 lg:p-0">
      <Button type="button" className="h-11 w-full" disabled={isDisabled} onClick={handleAddToCart}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
        Add to Cart
      </Button>
    </div>
  );
};

export default BuyButton;