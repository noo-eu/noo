import { and, eq } from "drizzle-orm";
import db, { schema } from ".";

export async function findOidcConsent(clientId: string, userId: string) {
  const existing = await db.query.oidcConsents.findFirst({
    where: and(
      eq(schema.oidcConsents.clientId, clientId),
      eq(schema.oidcConsents.userId, userId),
    ),
  });

  return (
    existing || {
      userId,
      clientId,
      scopes: [] as string[],
      claims: [] as string[],
      createdAt: new Date(),
    }
  );
}

const OidcConsents = {
  findOrInitialize: findOidcConsent,
};

export default OidcConsents;
