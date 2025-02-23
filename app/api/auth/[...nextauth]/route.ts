// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/firebase-admin";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        firstName: { label: "First Name", type: "text" },
        lastName: { label: "Last Name", type: "text" },
        isSignUp: { label: "Is Sign Up", type: "boolean" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          if (credentials.isSignUp === "true") {
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              credentials.email,
              credentials.password
            );

            if (!userCredential.user) {
              throw new Error("Failed to create user");
            }

            const userData = {
              firstName: credentials.firstName,
              lastName: credentials.lastName,
              email: credentials.email,
              createdAt: new Date(),
              lastLogin: new Date()
            };

            await db.collection("users").doc(userCredential.user.uid).set(userData);

            // Make sure to return a valid user object
            return {
              id: userCredential.user.uid,
              email: credentials.email,
              name: `${credentials.firstName} ${credentials.lastName}`,
              emailVerified: null
            } as any;
          }
          // ... your existing login code
        } catch (error: any) {
          console.error("Auth error:", error);
          throw new Error(error.message || "Authentication failed");
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }: { session: any, token: any }) {
      if (session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }: { token: any, user?: any }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt" as const
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };