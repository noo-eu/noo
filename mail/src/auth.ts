import NextAuth from "next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "noo-id",
      name: "noo id",
      type: "oidc",
      issuer: "https://id.noo.eu/oidc",
      clientId: process.env.NOO_ID_CLIENT_ID,
      clientSecret: process.env.NOO_ID_CLIENT_SECRET,
    },
  ],
});
