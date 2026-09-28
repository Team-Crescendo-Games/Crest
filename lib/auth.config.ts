import type { NextAuthConfig } from "next-auth";

/**
 * Prisma-free auth config. Imported by proxy.ts so the proxy bundle does not
 * pull in the Prisma client runtime (~4.9 MB WASM query compiler).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
