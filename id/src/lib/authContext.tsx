"use client";

import { createContext, useContext } from "react";
import { ClientUser } from "./types/ClientUser";

const AuthContext = createContext<ClientUser>({} as ClientUser);

export { AuthContext };

export function AuthProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ClientUser;
}) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
