import { uuidToHumanId } from "@noo/lib/humanIds";
import { type Session } from "~/db.server/sessions";
import type { ClientSession } from "./ClientSession.client";
import { makeClientUser } from "./ClientUser";

export function makeClientSession(session: Session): ClientSession {
  return {
    id: uuidToHumanId(session.id, "sess"),
    ip: session.ip,
    userAgent: session.userAgent,
    lastUsedAt: session.lastUsedAt,
    user: makeClientUser(session.user),
  };
}
