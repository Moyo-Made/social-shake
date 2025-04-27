import { AuthOptions } from "next-auth";
import TikTokProvider from "./providers/tiktok-provider";
import { firebaseAdmin } from "./lib/firebaseAdmin"; // You'll need to create this

export const authConfig: AuthOptions = {
  providers: [
    TikTokProvider({
      clientId: process.env.TIKTOK_CLIENT_KEY!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/tiktok`,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Add TikTok token to the session so it's available to your app
      if (token.tiktokAccessToken) {
        session.tiktokAccessToken = token.tiktokAccessToken as string;
      }
      return session;
    },
    async jwt({ token, account }) {
      // Save the access token to the JWT token for future sessions
      if (account && account.access_token) {
        token.tiktokAccessToken = account.access_token;
        
        // Save to Firebase DB
        try {
          await firebaseAdmin.firestore().collection("users").doc(token.sub).set({
            tiktokAccessToken: account.access_token,
            tiktokRefreshToken: account.refresh_token,
            tiktokTokenExpiry: account.expires_at,
          }, { merge: true });
        } catch (error) {
          console.error("Error saving token to Firebase:", error);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};