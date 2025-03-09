import { ProfilePage } from "@/components/Profile";
import {
  getFirstSession,
  getSessionCookie,
  SessionsService,
} from "@/lib/SessionsService";
import { uuidToHumanId } from "@/utils";
import { redirect } from "next/navigation";

export async function getCurrentSession(sid?: string) {
  const sessionManager = new SessionsService(await getSessionCookie());
  return sid ? sessionManager.getSessionBySid(sid) : getFirstSession();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sid?: string }>;
}) {
  const session = await getCurrentSession((await searchParams).sid);
  if (!session) {
    redirect("/signin");
  }

  const user = {
    id: uuidToHumanId(session.user.id, "usr"),
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    picture: session.user.picture,
  };

  return <ProfilePage user={user} />;
}
