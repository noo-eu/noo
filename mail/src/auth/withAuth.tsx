import { redirect } from "next/navigation";
import { AuthProvider, User } from "./authContext";
import { getCurrentSession } from "./session";

// Higher-order component to wrap app router pages with auth
export function withAuth<P extends { params: Promise<{ uIdx: string }> }>(
  Component: React.ComponentType<P & { user: User }>,
) {
  return async function WithAuthComponent(props: P) {
    const params = await props.params;
    const uIdx = parseInt(params.uIdx, 10);
    if (isNaN(uIdx)) {
      redirect("/0");
    }

    const session = await getCurrentSession();
    if (!session) {
      redirect("/auth/start");
    }

    const nooSessions = session.sessionData.authenticatedSessions;
    if (nooSessions.length <= uIdx) {
      redirect("/auth/start");
    }

    const nooSession = nooSessions[uIdx];
    const userProfile = await getUserProfile(nooSession);

    if (!userProfile) {
      redirect("/auth/start");
    }

    return (
      <AuthProvider user={userProfile}>
        <Component {...props} user={userProfile} />
      </AuthProvider>
    );
  };
}

async function getUserProfile(nooSession: {
  sessionId: string;
  userId: string;
}) {
  const response = await fetch(`${process.env.NOO_ID_URL}/_noo/user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // TODO: some authentication?
    },
    body: JSON.stringify({
      id: nooSession.userId,
      sessionId: nooSession.sessionId,
    }),
  });

  if (!response.ok) {
    console.error(
      "Failed to fetch user profile",
      response.status,
      response.statusText,
    );
    return undefined;
  }

  const data = await response.json();
  if (!data || !data.user) {
    console.error("Invalid user profile response", data);
    return undefined;
  }

  return data.user;
}
