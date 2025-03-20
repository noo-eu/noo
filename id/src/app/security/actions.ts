"use server";

import { sessions } from "@/db/schema";
import Sessions from "@/db/sessions";
import Users from "@/db/users";
import { checkPwnedPassword } from "@/lib/password";
import { SessionsService } from "@/auth/SessionsService";
import { hashPassword } from "@/lib/SignupService";
import { humanIdToUuid } from "@/utils";
import { and, eq, not } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function terminateSession(uid: string, sid: string) {
  await Sessions.destroy(sid);

  return redirect(`/security/sessions?uid=${uid}`);
}
