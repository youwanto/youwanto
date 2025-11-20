'use client';
import { CartItem } from "@/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import{ addItemToCart } from "@/lib/actions/cart.actions";
import { toast } from "sonner";

const AddToCart = ({ item }: { item: Omit<CartItem, "cartId"> }) => {
    const router = useRouter();
    const handleAddToCart = async () => {
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
            
    };
    return (
        <Button className="w-full" type="button" onClick={handleAddToCart}>
            Add to cart
        </Button>
    );
};

export default AddToCart;