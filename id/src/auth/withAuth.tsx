import { User } from "@/db/users";
import { redirect } from "next/navigation";
import { SessionsService } from "./SessionsService";
import { AuthProvider } from "./authContext";
import { makeClientUser } from "@/lib/types/ClientUser";

// Higher-order component to wrap app router pages with auth
export function withAuth<P extends { searchParams: Promise<{ uid?: string }> }>(
  Component: React.ComponentType<P & { user: User }>,
) {
  return async function WithAuthComponent(props: P) {
    const params = await props.searchParams;
    // if (!params.uid) {
    //   redirect("/signin");
    // }

    const user = await SessionsService.user(params.uid);
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
