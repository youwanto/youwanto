'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type SessionUser = { name?: string | null; email?: string | null };

// The session is read in the browser (not with `auth()` on the server) so that pages
// using the header can be statically rendered and cached.
const UserButton = () => {
    const pathname = usePathname();
    const [user, setUser] = useState<SessionUser | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/auth/session")
            .then((res) => (res.ok ? res.json() : null))
            .then((session: { user?: SessionUser } | null) => {
                if (!cancelled) setUser(session?.user ?? null);
            })
            .catch(() => {
                if (!cancelled) setUser(null);
            });

        return () => {
            cancelled = true;
        };
    }, [pathname]);

    if (!user) {
        return (
            <Button asChild>
                <Link href="/sign-in">Sign In</Link>
            </Button>
        );
    }

    const firstInitial = user.name?.charAt(0).toUpperCase() ?? "X";
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
                            <p className="text-sm font-medium leading-none">{user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuItem className="p-0 mb-1">
                        <Button
                            className="w-full py-4 px-2 h-4 justify-start"
                            variant={"ghost"}
                            onClick={() => signOut({ redirectTo: "/" })}
                        >
                            Sign Out
                        </Button>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
export default UserButton;
