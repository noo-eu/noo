import { uuidToHumanId } from "@noo/lib/humanIds";
import { type Session } from "~/db/sessions";
import type { ClientSession } from "./ClientSession.client";

export function makeClientSession(session: Session): ClientSession {
  return {
    id: uuidToHumanId(session.id, "sess"),
    ip: session.ip,
    userAgent: session.userAgent,
    lastUsedAt: session.lastUsedAt,
  };
}
