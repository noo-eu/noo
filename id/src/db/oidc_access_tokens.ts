import { eq } from "drizzle-orm";
import db, { schema } from ".";

export async function createOidcAccessToken(
  clientId: string,
  userId: string,
  scopes: string[],
  claims: string[],
  nonce?: string,
) {
  return (
    await db
      .insert(schema.oidcAccessTokens)
      .values({
        clientId,
        userId,
        scopes,
        claims,
        nonce,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      })
      .returning()
  ).pop()!;
}

export async function findOidcAccessToken(id: string) {
  return db.query.oidcAccessTokens.findFirst({
    where: eq(schema.oidcAccessTokens.id, id),
  });
}

export async function deleteOidcAccessToken(id: string) {
  return db
    .delete(schema.oidcAccessTokens)
    .where(eq(schema.oidcAccessTokens.id, id));
}
