"use server";

import Sessions from "@/db/sessions";
import { redirect } from "next/navigation";

export async function terminateSession(uid: string, sid: string) {
  await Sessions.destroy(sid);

  return redirect(`/security/sessions?uid=${uid}`);
}
