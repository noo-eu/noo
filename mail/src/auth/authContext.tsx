"use client";

import { createContext, useContext } from "react";

const AuthContext = createContext<{ name: string }>({ name: "" });

export { AuthContext };

export function AuthProvider({
  children,
  user,
}: Readonly<{
  children: React.ReactNode;
  user: { name: string };
}>) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const user = useContext(AuthContext);
  if (!user) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return user;
}
