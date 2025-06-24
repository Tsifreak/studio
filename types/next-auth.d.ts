import NextAuth from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's postal address. */
      id: string; // Add this line
      name?: string | null;
      email?: string | null;
      image?: string | null;
      // Add any other custom properties you expect on the user object
    } & DefaultSession["user"];
  }

  /**
   * The type of the user in the JWT
   */
  interface JWT {
    id?: string; // Also extend the JWT type if you store the ID in the token
  }
}