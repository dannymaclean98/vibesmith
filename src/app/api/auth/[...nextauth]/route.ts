import NextAuth, { AuthOptions } from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';
import { PrismaClient } from '@prisma/client';

// Directly initialize a new Prisma client for Auth
console.log('[DEBUG] Initializing PrismaClient for Auth...');
let prismaClientAuth: PrismaClient;
try {
  prismaClientAuth = new PrismaClient();
  console.log('[DEBUG] PrismaClient initialized successfully:', !!prismaClientAuth);
  console.log('[DEBUG] PrismaClient methods available:', Object.keys(prismaClientAuth));
} catch (error) {
  console.error('[DEBUG] Error initializing PrismaClient:', error);
  // Fallback initialization
  prismaClientAuth = new PrismaClient();
}

// Spotify OAuth scopes
const scopes = ['user-read-email', 'user-read-private', 'user-library-read'].join(' ');

// Create and log the PrismaAdapter
console.log('[DEBUG] Creating PrismaAdapter...');
const prismaAdapter = PrismaAdapter(prismaClientAuth);
console.log('[DEBUG] PrismaAdapter created:', !!prismaAdapter);
console.log('[DEBUG] PrismaAdapter methods:', Object.keys(prismaAdapter));

export const authOptions: AuthOptions = {
  adapter: prismaAdapter,
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
      authorization: {
        params: { scope: scopes },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        console.log('[DEBUG] JWT callback with account and user:', { userId: user.id });
        // Store tokens in database for later use
        try {
          console.log('[DEBUG] Attempting to upsert token...');
          await prismaClientAuth.token.upsert({
            where: { userId: user.id },
            update: {
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt: new Date(Date.now() + (account.expires_at || 3600) * 1000),
            },
            create: {
              userId: user.id,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt: new Date(Date.now() + (account.expires_at || 3600) * 1000),
            },
          });
          console.log('[DEBUG] Token upsert successful');
        } catch (error) {
          console.error('[DEBUG] Error storing Spotify tokens:', error);
        }

        return {
          ...token,
          id: user.id,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add user ID and token to the session
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    signOut: '/',
    error: '/api/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
};

console.log('[DEBUG] Auth options created:', !!authOptions);
console.log('[DEBUG] Auth adapter exists:', !!authOptions.adapter);

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
