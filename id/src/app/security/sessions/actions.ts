"use server";

import Sessions from "@/db/sessions";
import { humanIdToUuid } from "@/utils";
import { redirect } from "next/navigation";

export async function terminateSession(uid: string, sid: string) {
  const sessionId = humanIdToUuid(sid, "sess")!;

  const session = await Sessions.find(sessionId);
  if (!session || session.userId !== uid) {
    redirect("/signin");
  }

  await Sessions.destroy(sid);
}
