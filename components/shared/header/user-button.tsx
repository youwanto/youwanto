import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOutUser } from "@/lib/actions/user.action";

const UserButton = async () => {
    const session = await auth();
    if (!session) {
        return (
            <Link href="/sign-in">
                <Button>
                    Sign In
                </Button>
            </Link>
        );
    }
    const firstInitial = session.user?.name?.charAt(0).toUpperCase() ?? "X";
    return (
        <div className="flex gap-2 items-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="flex items-center">
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2 flex items-center justify-center bg-blue-200 dark:bg-blue-400">
                            {firstInitial}
                        </Button>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuItem className="p-0 mb-1">
                        <form action={signOutUser} className="w-full">
                            <Button className="w-full py-4 px-2 h-4 justify-start" variant={"ghost"}>Sign Out</Button>
                        </form>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
export default UserButton;