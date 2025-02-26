"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SessionsService } from "@/services/SessionsService";
import { schema } from "@/db";
import { getIpAddress, getUserAgent } from "@/utils";

export async function signin(prevState: unknown, formData: FormData) {
  const cookieStore = await cookies();
  const svc = new SessionsService(cookieStore.get("auth")?.value || "");

  const user = await svc.authenticate(
    (formData.get("username") as string).trim(),
    (formData.get("password") as string).trim(),
  );

  let continueUrl = formData.get("continue")?.toString();
  if (!continueUrl || !continueUrl.startsWith("/")) {
    continueUrl = "/";
  }

  if (user) {
    await startSession(user);
    redirect(continueUrl);
  } else {
    return {
      username: formData.get("username") as string,
      error: 1,
    };
  }
}

async function startSession(user: typeof schema.users.$inferSelect) {
  const cookieStore = await cookies();
  const sessionManager = new SessionsService(
    cookieStore.get("auth")?.value || "",
  );

  await sessionManager.startSession(
    user.id,
    await getIpAddress(),
    await getUserAgent(),
  );

  // Delete old, expired, tampered sessions
  await sessionManager.cleanup();

  cookieStore.set("auth", sessionManager.buildCookie(), {
    maxAge: 60 * 60 * 24 * 400,
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
}
