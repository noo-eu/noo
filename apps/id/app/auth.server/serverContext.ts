import { unstable_createContext } from "react-router";
import type { UserWithTenant } from "~/db.server/users.server";

export const userContext = unstable_createContext<UserWithTenant | undefined>();
