import { createContext } from "react";

type AuthContext = {
  id: string;
  firstName: string;
  lastName: string | null;
  picture: string | null;
};

const AuthContext = createContext<AuthContext>({
  id: "",
  firstName: "",
  lastName: null,
  picture: null,
});

export { AuthContext };
