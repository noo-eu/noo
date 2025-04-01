import { redirect } from "next/navigation";
import { AuthProvider } from "./authContext";

// Higher-order component to wrap app router pages with auth
export function withAuth<P extends { params: Promise<{ uIdx: string }> }>(
  Component: React.ComponentType<P & { user: { name: string } }>,
) {
  return async function WithAuthComponent(props: P) {
    const params = await props.params;

    const user = { name: "Mario" }; //await getAuthenticatedUser(params.uIdx);
    if (!user) {
      redirect("/signin");
    }

    return (
      <AuthProvider user={user}>
        <Component {...props} user={user} />
      </AuthProvider>
    );
  };
}
