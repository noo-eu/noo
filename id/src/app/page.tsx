import { getSessionCookie, SessionsService } from "@/lib/SessionsService";
import { redirect } from "next/navigation";

export async function getCurrentUser(sid?: string) {
  const sessionManager = new SessionsService(await getSessionCookie());
  return sid ? sessionManager.getUserBySid(sid) : sessionManager.getUser(0);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sid?: string }>;
}) {
  const user = await getCurrentUser((await searchParams).sid);
  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="flex flex-col items-center h-screen">
      <h1 className="text-4xl font-medium my-16">Welcome, {user.firstName}!</h1>
    </div>
  );
}
