import { SessionsService } from "@/services/SessionsService";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionManager = new SessionsService(
    cookieStore.get("auth")?.value || "",
  );

  return sessionManager.getUser();
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
