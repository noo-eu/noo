import { getSessionCookie, SessionsService } from "@/lib/SessionsService";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const sessionManager = new SessionsService(await getSessionCookie());
  return sessionManager.getUser();
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="flex flex-col items-center h-screen">
      <h1 className="text-4xl font-medium my-16">
        Welcome back, {user.firstName}!
      </h1>

      <p>This is a placeholder page.</p>
    </div>
  );
}
