import { redirect, type LoaderFunctionArgs } from "react-router";
import { userContext } from "./serverContext";
import { getFirstAuthenticatedUserId } from "./sessions";

export function withAuth<T>(
  loader: (args: LoaderFunctionArgs) => Promise<T>,
): (args: LoaderFunctionArgs) => Promise<T> {
  return async (args: LoaderFunctionArgs): Promise<T> => {
    if (!args.context.get(userContext)) {
      const userId = await getFirstAuthenticatedUserId(args.request);
      if (userId) {
        throw redirect(`?uid=${userId}`);
      } else {
        throw redirect("/signin");
      }
    }

    return loader(args);
  };
}

export const emptyAuthLoader = withAuth(async () => {});
