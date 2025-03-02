import { eq } from "drizzle-orm";
import db, { schema } from ".";

export async function createOidcAuthorizationCode(
  clientId: string,
  userId: string,
  data: unknown,
) {
  return (
    await db
      .insert(schema.oidcAuthorizationCodes)
      .values({
        id: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
          "base64url",
        ),
        clientId,
        userId,
        data,
      })
      .returning()
  ).pop()!;
}

export async function findOidcAuthorizationCode(id: string) {
  return db.query.oidcAuthorizationCodes.findFirst({
    where: eq(schema.oidcAuthorizationCodes.id, id),
  });
}
