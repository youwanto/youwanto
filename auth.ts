import NextAuth from 'next-auth';
import { prisma } from '@/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';
import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

export const config: NextAuthConfig = {
    secret: process.env.AUTH_SECRET,
    pages: {
        signIn: '/sign-in',
        signOut: '/sign-out',
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
        async session({ session, user, trigger, token }: any) {
            // Set the user id from the token
            session.user.id = token.sub;

            // If there is an update, set the user name
            if (trigger === 'update') {
                session.user.name = user.name;
            }
            return session;
        },
    }
};
export const { handlers, auth, signIn, signOut } = NextAuth(config);
