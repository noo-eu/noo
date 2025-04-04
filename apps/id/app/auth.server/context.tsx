import { createContext, useContext } from "react";
import { type ClientUser } from "~/types/ClientUser.client";

const AuthContext = createContext<ClientUser | undefined>(undefined);

export { AuthContext };

export function AuthProvider({
  children,
  user,
}: Readonly<{
  children: React.ReactNode;
  user: ClientUser | undefined;
}>) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const user = useContext(AuthContext);
  if (!user || !user.id) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return user;
}
