'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/actions/user.action";
import { SIGNUP_DEFAULT_VALUES } from "@/lib/constants";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";


const SignUpForm = () => {
    const [data, action] = useActionState(signUp, {
        message: "",
        success: false,
    });

    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const SignUpButton = () => {
        const {pending} = useFormStatus();
        return (
            <Button className="w-full" variant={'default'} disabled={pending}>
                {pending ? "Signing Up..." : "Sign Up"}
            </Button>
        );
    };
    return (
        <form action={action}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <div className="space-y-6">
                <div>
                    <Label htmlFor="name">Name</Label>
                    <Input type="text" id="name" name="name" required defaultValue={SIGNUP_DEFAULT_VALUES.name} autoComplete="name"/>
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input type="email" id="email" name="email" required defaultValue={SIGNUP_DEFAULT_VALUES.email} autoComplete="email"/>
                </div>
                <div>
                    <Label htmlFor="password">Password</Label>
                    <Input type="password" id="password" name="password" required defaultValue={SIGNUP_DEFAULT_VALUES.password} autoComplete="current-password"/>
                </div>
                <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input type="password" id="confirmPassword" name="confirmPassword" required defaultValue={SIGNUP_DEFAULT_VALUES.confirmPassword} autoComplete="current-password"/>
                </div>
                <div>
                    <SignUpButton />
                </div>
                {
                    !data.success && (
                        <div className="text-center text-destructive">{data.message}</div>
                    )
                }
                <div className="text-sm text-center text-muted-foreground">
                    Already have an account?{" "}
                    <Link href={`/sign-in?callbackUrl=${callbackUrl}`} target="_self" className="link">Sign In</Link>
                </div>
            </div>
        </form>
    );
};
export default SignUpForm;