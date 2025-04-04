import { User } from "@/db/users";
import { makeClientUser } from "@/lib/types/ClientUser";
import { redirect } from "next/navigation";
import { AuthProvider } from "./authContext";
import { getAuthenticatedUser, getFirstAuthenticatedUserId } from "./sessions";

// Higher-order component to wrap app router pages with auth
export function withAuth<P extends { searchParams: Promise<{ uid?: string }> }>(
  Component: React.ComponentType<P & { user: User }>,
) {
  return async function WithAuthComponent(props: P) {
    const params = await props.searchParams;
    if (!params.uid) {
      const userId = await getFirstAuthenticatedUserId();

      // Redirect to the same page with the first authenticated user
      if (userId) {
        redirect(`?uid=${userId}`);
      } else {
        redirect("/signin");
      }
    }

    const user = await getAuthenticatedUser(params.uid);
    if (!user) {
      redirect("/signin");
    }

    return (
      <AuthProvider user={makeClientUser(user)}>
        <Component {...props} user={user} />
      </AuthProvider>
    );
  };
}
