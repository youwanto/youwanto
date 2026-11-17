import NextAuth from 'next-auth';
import { prisma } from '@/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';
import type { NextAuthConfig } from 'next-auth';
import { cookies } from 'next/headers';

export const config: NextAuthConfig = {
    secret: process.env.AUTH_SECRET,
    pages: {
        signIn: '/sign-in',
    },
    session:{
        strategy: "jwt", 
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            credentials: {
                email: { type: "email" },
                password: { type: "password" }
            },
            async authorize(credentials) {
                if (credentials==null) return null;
                // Find user in database
                const user = await prisma.user.findFirst({
                    where: { email: credentials.email as string}
                });
                // Check if user exists and password matches
                if (user && user.password) {
                    const isMatch = compareSync(
                        credentials.password as string, 
                        user.password
                    );
                    
                    // If password matches, return user object
                    if (isMatch) {
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                        };
                    }
                }
                // If user does not exist or password does not match, return null
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // `user` is only set when signing in
            if (user) {
                token.role = user.role ?? 'user';

                if (trigger === 'signIn' || trigger === 'signUp') {
                    await claimGuestCart(user.id);
                }
            }

            // Client called `update({ user: { name } })`
            if (trigger === 'update' && session?.user?.name) {
                token.name = session.user.name;
            }

            return token;
        },
        async session({ session, token }) {
            if (token.sub) session.user.id = token.sub;
            session.user.role = token.role ?? 'user';
            if (token.name) session.user.name = token.name;

            return session;
        },
    }
};

// Hand the guest cart over to the user who just signed in.
// A non-empty guest cart replaces any older cart saved on the account.
async function claimGuestCart(userId?: string) {
    if (!userId) return;

    try {
        const sessionCartId = (await cookies()).get('sessionCartId')?.value;
        if (!sessionCartId) return;

        const guestCart = await prisma.cart.findFirst({
            where: { sessionCartId, userId: null },
        });
        if (!guestCart || !Array.isArray(guestCart.items) || guestCart.items.length === 0) return;

        await prisma.$transaction([
            prisma.cart.deleteMany({ where: { userId } }),
            prisma.cart.update({ where: { id: guestCart.id }, data: { userId } }),
        ]);
    } catch (error) {
        // Never block sign-in because of the cart
        console.error('Failed to claim guest cart:', error);
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth(config);
