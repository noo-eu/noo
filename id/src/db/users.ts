import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";
import db, { schema } from ".";
import { findTenantByDomainName } from "./tenants";

export async function findUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(schema.sessions.id, userId),
    with: { tenant: true },
  });
}

function parseEmail(email: string) {
  const [localPart, domain] = email.split("@");
  return {
    username: localPart
      .trim()
      .toLocaleLowerCase()
      .replaceAll(".", "")
      .replace(/\+.*$/, ""),
    domain:
      domain === "noomail.eu" ? undefined : domain?.trim().toLocaleLowerCase(),
  };
}

export async function findUserByEmailOrUsername(email: string) {
  const { username, domain } = parseEmail(email);

  if (domain) {
    const tenant = await findTenantByDomainName(domain);
    if (!tenant) {
      return null;
    }

    return await db.query.users.findFirst({
      where: and(
        eq(schema.users.normalizedUsername, username),
        eq(schema.users.tenantId, tenant.id),
      ),
    });
  } else {
    return await db.query.users.findFirst({
      where: and(
        eq(schema.users.normalizedUsername, username),
        isNull(schema.users.tenantId),
      ),
    });
  }
}

export async function createUser(attributes: typeof schema.users.$inferInsert) {
  return (await db.insert(schema.users).values(attributes).returning()).pop()!;
}

export async function isUsernameAvailable(
  normalizedUsername: string,
  tenantId: string | null,
) {
  const existing = await db.query.users.findFirst({
    where: and(
      tenantId
        ? eq(schema.users.tenantId, tenantId)
        : isNull(schema.users.tenantId),
      eq(schema.users.normalizedUsername, normalizedUsername),
    ),
  });

  return !existing;
}

async function authenticate(username: string, password: string) {
  const user = await findUserByEmailOrUsername(username);
  if (!user) {
    return null;
  }

  // Check if the password is correct
  try {
    if (await argon2.verify(user.passwordDigest!, password)) {
      return user;
    }
  } catch {
    return null;
  }

  return null;
}

const Users = {
  find: findUserById,
  create: createUser,
  authenticate,
};

export default Users;
export type User = typeof schema.users.$inferSelect;
export type UserWithTenant = typeof schema.users.$inferSelect & {
  tenant: Awaited<ReturnType<typeof findTenantByDomainName>> | null;
};
