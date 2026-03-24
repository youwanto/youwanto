'use client';

import Image from "next/image";
import Link from "next/link";
import { Cart, CartItem } from "@/types";
import ProductPrice from "@/components/shared/product/product-price";
import AddToCart from "@/components/shared/product/add-to-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Truck, Trash2 } from "lucide-react";
import { removeItemCompletely } from "@/lib/actions/cart.actions";
import { toast } from "sonner";

const getLineTotal = (item: CartItem) =>
  Number(item.price) * item.quantity;

const CartTable = ({ cart }: { cart?: Cart }) => {
  const items = cart?.items ?? [];
  const currency = items[0]?.currency ?? "USD";
  const handleRemoveItem = async (item: CartItem) => {
    const res = await removeItemCompletely(item.productId);
    if (!res.success) {
      toast.error(res.message || "Failed to remove item.");
      return;
    }
    toast.success(res.message || `${item.name} removed from cart.`);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="h2-bold">Your cart is empty</h1>
          <p className="text-muted-foreground">
            Add a few pieces you love and check back here.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Explore products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="h2-bold">Shopping Cart</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length === 1 ? "" : "s"} in your bag
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/">Continue shopping</Link>
          </Button>
        </div>

        <div className="rounded-2xl border bg-card/60">
          <div className="hidden grid-cols-12 gap-4 border-b px-6 py-4 text-xs font-medium uppercase text-muted-foreground md:grid">
            <div className="col-span-6">Item</div>
            <div className="col-span-2 text-center">Price</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Subtotal</div>
          </div>
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.productId}
                className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-12 md:items-center"
              >
                <div className="flex gap-4 md:col-span-6">
                  <div className="relative h-24 w-20 overflow-hidden rounded-xl border">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/product/${item.slug}`} className="font-medium">
                      {item.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      Free returns within 30 days
                    </div>
                  </div>
                </div>
                <div className="md:hidden flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <div className="space-y-1">
                    <div className="text-xs uppercase text-muted-foreground">Price</div>
                    <ProductPrice value={item.price} currency={item.currency} className="text-base" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase text-muted-foreground">Qty</div>
                    <AddToCart
                      cart={cart}
                      item={{
                        productId: item.productId,
                        name: item.name,
                        quantity: 1,
                        slug: item.slug,
                        price: item.price,
                        currency: item.currency,
                        image: item.image,
                      }}
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-xs uppercase text-muted-foreground">Subtotal</div>
                    <ProductPrice value={getLineTotal(item)} currency={item.currency} className="text-base" />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveItem(item)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="hidden md:block md:col-span-2 md:text-center">
                  <ProductPrice value={item.price} currency={item.currency} className="text-base" />
                </div>
                <div className="hidden md:block md:col-span-2 md:text-center">
                  <AddToCart
                    cart={cart}
                    item={{
                      productId: item.productId,
                      name: item.name,
                      quantity: 1,
                      slug: item.slug,
                      price: item.price,
                      currency: item.currency,
                      image: item.image,
                    }}
                  />
                </div>
                <div className="hidden md:block md:col-span-2 md:text-right">
                  <ProductPrice value={getLineTotal(item)} currency={item.currency} className="text-base" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <Card className="sticky top-24">
          <CardHeader className="space-y-1">
            <CardTitle>Order Summary</CardTitle>
            <p className="text-xs text-muted-foreground">
              Taxes and shipping calculated at checkout
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <ProductPrice value={cart?.itemsPrice ?? 0} currency={currency} className="text-base" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <ProductPrice value={cart?.shippingPrice ?? 0} currency={currency} className="text-base" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <ProductPrice value={cart?.taxPrice ?? 0} currency={currency} className="text-base" />
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>
              <ProductPrice value={cart?.totalPrice ?? 0} currency={currency} className="text-base" />
            </div>
            <Button className="w-full">Proceed to checkout</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">Fast delivery</div>
              <div className="text-muted-foreground">Ships in 2-4 business days</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CartTable;
