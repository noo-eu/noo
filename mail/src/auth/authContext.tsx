"use client";

import { createContext, useContext } from "react";

export type User = {
  firstName: string;
};

const AuthContext = createContext<User>({ firstName: "" });

export { AuthContext };

export function AuthProvider({
  children,
  user,
}: Readonly<{
  children: React.ReactNode;
  user: User;
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
