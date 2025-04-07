import { uuidToHumanId } from "@noo/lib/humanIds";
import { type Passkey } from "~/db.server/passkeys";
import type { ClientPasskey } from "./ClientPasskey.client";

export function makeClientPasskey(passkey: Passkey): ClientPasskey {
  return {
    id: uuidToHumanId(passkey.id, "idpsk"),
    name: passkey.name,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
  };
}
