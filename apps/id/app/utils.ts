import { normalizeLocale } from "@noo/lib/i18n";
import { loadMessages, localeFromRequest } from "@noo/lib/i18n.server";
import type { User } from "./db.server/users.server";

export async function resolveLocale(user: User | undefined, request: Request) {
  // First check from the user session
  if (user) {
    return { locale: normalizeLocale(user.locale), rawLocale: user.locale };
  }

  return localeFromRequest(request);
}

const messagesCache = new Map<string, Record<string, unknown>>();

export async function getMessages(locale: string) {
  const normalizedLocale = normalizeLocale(locale);
  if (messagesCache.has(normalizedLocale)) {
    return messagesCache.get(normalizedLocale)!;
  }

  const messages = await loadMessages(normalizedLocale);
  if (process.env.NODE_ENV !== "development") {
    messagesCache.set(normalizedLocale, messages);
  }

  return messages;
}
