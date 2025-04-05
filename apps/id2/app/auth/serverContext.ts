import { unstable_createContext } from "react-router";
import type { User } from "~/db/users.server";

export const userContext = unstable_createContext<User | undefined>();
