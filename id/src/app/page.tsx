import { SESSION_COOKIE_NAME, SessionsService } from "@/lib/SessionsService";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionManager = new SessionsService(
    cookieStore.get(SESSION_COOKIE_NAME)?.value || "",
  );

  return sessionManager.getUser();
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionManager = new SessionsService(
    cookieStore.get(SESSION_COOKIE_NAME)?.value || "",
  );

  return (await sessionManager.activeSessions())[0];
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="flex justify-center h-screen">
      <h1 className="text-4xl font-medium mt-16">
        Welcome back, {user.firstName}!
      </h1>
    </div>
  );
}
