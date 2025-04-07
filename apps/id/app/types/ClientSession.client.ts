import type { ClientUser } from "./ClientUser.client";

export type ClientSession = {
  id: string;
  ip: string;
  userAgent: string | null;
  lastUsedAt: Date;
  user: ClientUser;
};
