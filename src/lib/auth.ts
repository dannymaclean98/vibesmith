import { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { getTokens, refreshAccessToken } from "@/lib/spotify";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "user-read-email user-read-private user-library-read user-library-modify playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-top-read user-follow-read user-follow-modify",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // If user is signing in with Spotify, save the spotifyId
      if (account && account.provider === 'spotify' && profile) {
        const spotifyProfile = profile as any;
        
        if (spotifyProfile.id) {
          // Update user record with Spotify ID
          await prisma.user.update({
            where: { id: user.id },
            data: { spotifyId: spotifyProfile.id }
          });
        }
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.id = user.id;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        
        // Save tokens to database
        if (account.access_token && account.refresh_token && account.expires_at) {
          const expiresAt = new Date(account.expires_at * 1000);
          
          await getTokens(
            user.id, 
            account.access_token, 
            account.refresh_token, 
            expiresAt
          );
        }
      }
      
      // Refresh token if needed
      if (token.expiresAt && Date.now() >= (token.expiresAt as number * 1000)) {
        const tokens = await refreshAccessToken(token.refreshToken as string);
        
        if (tokens) {
          token.accessToken = tokens.accessToken;
          token.expiresAt = tokens.expiresAt;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 