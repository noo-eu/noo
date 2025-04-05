export type ClientSession = {
  id: string;
  ip: string;
  userAgent: string | null;
  lastUsedAt: Date;
};
