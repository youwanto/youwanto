import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CredentialsSignInForm from "./credentials-signin-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account",
};

const SignInPage = async (
    props:{
        searchParams: Promise<{callbackUrl: string}>;
    }
) => {
    const {callbackUrl} = await props.searchParams;
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
                    <CardTitle className="text-center text-2xl font-bold">Sign In to Your Account</CardTitle>
                    <CardDescription className="text-center text-sm text-muted-foreground">
                        Please enter your email and password to sign in.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {/* Sign-in form component would go here */}
                <CredentialsSignInForm />
                </CardContent>
            </Card>
        </div>;
    };

export default SignInPage;