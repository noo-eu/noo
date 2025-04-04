"use server";

import { getAuthenticatedUser } from "@/auth/sessions";
import Sessions from "@/db/sessions";
import { humanIdToUuid } from "@/utils";
import { redirect } from "next/navigation";

export async function terminateSession(uid: string, sid: string) {
  const user = await getAuthenticatedUser(uid);
  if (!user) {
    redirect("/signin");
  }

  const sessionId = humanIdToUuid(sid, "sess")!;
  await Sessions.destroy(sessionId);
}
