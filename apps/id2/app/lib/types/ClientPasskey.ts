import { uuidToHumanId } from "@noo/lib/humanIds";
import { type Passkey } from "~/db/passkeys";

export type ClientPasskey = {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date;
};

export function makeClientPasskey(passkey: Passkey): ClientPasskey {
  return {
    id: uuidToHumanId(passkey.id, "idpsk"),
    name: passkey.name,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
  };
}
