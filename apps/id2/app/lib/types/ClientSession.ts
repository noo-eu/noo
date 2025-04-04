import { uuidToHumanId } from "@noo/lib/humanIds";
import { type Session } from "~/db/sessions";

export type ClientSession = {
  id: string;
  ip: string;
  userAgent: string | null;
  lastUsedAt: Date;
};

export function makeClientSession(session: Session): ClientSession {
  return {
    id: uuidToHumanId(session.id, "sess"),
    ip: session.ip,
    userAgent: session.userAgent,
    lastUsedAt: session.lastUsedAt,
  };
}
