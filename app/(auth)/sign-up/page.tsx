import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SignUpForm from "./signup-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Sign up for a new account",
};

const SignUpPage = async (
    props:{
        searchParams: Promise<{callbackUrl: string}>;
    }
) => {
    const searchParams = await props.searchParams;
    const {callbackUrl} = searchParams;
    const session = await auth();
    if (session) {
        return redirect(callbackUrl || "/");
    }
    return <div className="w-full max-w-md mx-auto">
            <Card>
                <CardHeader className="space-y-4">
                    <Link href="/" className="flex-center">
                        <Image
                            src="/images/youwanto-logo.svg"
                            alt={`${APP_NAME} Logo`}
                            width={100}
                            height={100}
                            priority={true}
                        />
                    </Link>
                    <CardTitle className="text-center text-2xl font-bold">Create a New Account</CardTitle>
                    <CardDescription className="text-center text-sm text-muted-foreground">
                        Please enter your information below to create your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {/* Sign-up form component would go here */}
                    <SignUpForm />
                </CardContent>
            </Card>
        </div>;
    };

export default SignUpPage;