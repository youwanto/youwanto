'use client';
import { Cart, CartItem } from "@/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Loader } from "lucide-react";
import{ addItemToCart, removeItemFromCart } from "@/lib/actions/cart.actions";
import { toast } from "sonner";
import { useTransition } from "react";

const AddToCart = ({ cart, item }: { cart?: Cart; item: Omit<CartItem, "cartId"> }) => {
    const router = useRouter();

    const [isPending, startTransition] = useTransition();

    const handleAddToCart = async () => {
        startTransition(async () => {
            // Execute the add items to cart action
            const res = await addItemToCart(item);
    
            // Display appropriate toast message based on the result
            if (!res.success) {
                toast.error(res.message || "Failed to add item to cart.");
                return;
            }
            toast.success(`${item.name} added to the cart`, {
                classNames: {
                    actionButton: "bg-primary text-white rounded-md hover:bg-gray-800",
                },
                action: {
                    label: "Go to cart",
                    onClick: () => router.push("/cart"),
                },
            });
        });
            
    };

    // Handle removing item from cart
    const handleRemoveFromCart = async () => {
        startTransition(async () => {
            const res = await removeItemFromCart(item.productId);
            if (!res.success) {
                toast.error(res.message || "Failed to remove item from cart.");
                return;
            }
            toast.success(`${item.name} removed from the cart`, {
                classNames: {
                    actionButton: "bg-primary text-white rounded-md hover:bg-gray-800",
                },
                action: {
                    label: "Go to cart",
                    onClick: () => router.push("/cart"),
                },
            });
        });
    };
    // Check if the item is already in the cart
    const existItem = cart?.items.find((x) => x.productId === item.productId);

    return existItem ? (
        <div className="flex items-center gap-2">
            <Button type="button" variant={"outline"} disabled={isPending} onClick={handleRemoveFromCart}>
                {isPending ? <Loader className="w-4 h-4 animate-spin"/> : <Minus className="w-4 h-4"/>}
            </Button>
            <span className="px-2">{existItem.quantity}</span>
            <Button type="button" variant={"outline"} disabled={isPending} onClick={handleAddToCart}>
                {isPending ? <Loader className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            </Button>
        </div>
    ) : (
        <Button className="w-full" type="button" disabled={isPending} onClick={handleAddToCart}>
            {isPending ? <Loader className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Add to cart
        </Button>
    );
};

export default AddToCart;
