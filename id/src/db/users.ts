import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";
import db, { schema } from ".";
import Tenants, { Tenant } from "./tenants";

async function find(userId: string) {
  return db.query.users.findFirst({
    where: eq(schema.sessions.id, userId),
    with: { tenant: true },
  });
}

function parseEmail(email: string) {
  const [localPart, domain] = email.split("@");
  const localUnaliased = localPart.split("+")[0];

  return {
    username: localUnaliased.trim().toLocaleLowerCase().replaceAll(".", ""),
    domain:
      domain === "noomail.eu" ? undefined : domain?.trim().toLocaleLowerCase(),
  };
}

async function findUserByEmailOrUsername(email: string) {
  const { username, domain } = parseEmail(email);

  if (domain) {
    const tenant = await Tenants.findBy(eq(schema.tenants.domain, domain));
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

async function create(attributes: typeof schema.users.$inferInsert) {
  return (await db.insert(schema.users).values(attributes).returning()).pop()!;
}

async function update(
  userId: string,
  attributes: Partial<typeof schema.users.$inferInsert>,
) {
  return db
    .update(schema.users)
    .set(attributes)
    .where(eq(schema.users.id, userId));
}

async function isUsernameAvailable(
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
  find,
  create,
  update,
  authenticate,
  isUsernameAvailable,
};

export default Users;
export type User = typeof schema.users.$inferSelect;
export type UserWithTenant = User & {
  tenant: Tenant | null;
};
