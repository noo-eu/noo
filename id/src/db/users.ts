import { verifyTotpWithTolerance } from "@/utils";
import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";
import db, { schema } from ".";
import { OidcClient } from "./oidc_clients";
import Tenants, { Tenant } from "./tenants";

async function find(userId: string) {
  return db.query.users.findFirst({
    where: eq(schema.sessions.id, userId),
    with: { tenant: true },
  });
}

function parseEmail(email: string): {
  username: string;
  domain: string | undefined;
} {
  const [localPart, domain] = email.split("@");
  const localUnaliased = localPart.split("+")[0];

  return {
    username: localUnaliased.trim().toLocaleLowerCase().replaceAll(".", ""),
    domain: domain?.trim().toLocaleLowerCase(),
  };
}

/**
 * Find a user by email or username.
 *
 * If the first argument does not contain an @ symbol, then the behavior depends
 * on the tenantId:
 *
 *   - if the tenantId is null (we are either doing a simple sign in, or an OIDC
 *     authorization to a public client), then we assume the user is a public
 *     noo user, with a @noomail.eu email address.
 *   - if tenantId is not null, then we assume the search must be done in the
 *     tenant's user pool, and the username is the local part of the email
 *     address.
 *
 * If the first argument does contain an @ symbol:
 *
 *  - if there is a tenantId:
 *  - if the teanant has a registered domain, the domain must match the
 *    tenant's domain.
 *  - otherwise a domain is not allowed.
 *  - if there is no tenantId:
 *    - @noomail.eu is ok, because it is the default domain for public users.
 *    - another domain must be associated with a tenant, the tenant must allow
 *      public clients.
 *
 * @param email
 * @param tenantId - Restrict the user search to a specific tenant. When this is
 * null, the search will be done in the global user pool.
 * @returns
 */
async function findUserByEmailOrUsername(email: string, tenantId?: string) {
  if (tenantId) {
    return await findUserByEmailOrUsernameInTenant(email, tenantId);
  }

  const { username, domain } = parseEmail(email);

  // If there's a domain in the username and this is not noomail domain,
  // then this must be a tenanted user.
  if (domain && domain !== "noomail.eu") {
    const tenant = await Tenants.findBy(eq(schema.tenants.domain, domain));
    if (!tenant) {
      return null;
    }

    // Later: check if the tenant allows public clients

    return await db.query.users.findFirst({
      where: and(
        eq(schema.users.normalizedUsername, username),
        eq(schema.users.tenantId, tenant.id),
      ),
    });
  } else {
    // This is a public user, or a tenant user with no domain. However, tenant
    // users with no domain be found by this code path.
    return await db.query.users.findFirst({
      where: and(
        eq(schema.users.normalizedUsername, username),
        isNull(schema.users.tenantId),
      ),
    });
  }
}

async function findUserByEmailOrUsernameInTenant(
  email: string,
  tenantId: string,
) {
  const tenant = await Tenants.findBy(eq(schema.tenants.id, tenantId));
  if (!tenant) {
    return null;
  }

  const { username, domain } = parseEmail(email);

  // If a domain is missing we are searching in the tenant's user pool, anyway.
  // If there's a domain in the username it must match the tenant's domain.
  if (domain && tenant.domain) {
    if (domain !== tenant.domain) {
      return null;
    }
  } else if (domain) {
    // A domain is specified, but the tenant does not have a domain.
    return null;
  }

  return await db.query.users.findFirst({
    where: and(
      eq(schema.users.normalizedUsername, username),
      eq(schema.users.tenantId, tenant.id),
    ),
  });
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
    .set({
      updatedAt: new Date(),
      ...attributes,
    })
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

async function authenticate(
  username: string,
  password: string,
  oidcClient?: OidcClient,
) {
  const user = await findUserByEmailOrUsername(
    username,
    oidcClient?.tenantId ?? undefined,
  );
  if (!user) {
    return null;
  }

  // Check if the password is correct
  try {
    if (await argon2.verify(user.passwordDigest!, password)) {
      return user;
    }

    // Artificially slow down the response to slow down brute force attacks.
    await new Promise((resolve) => setTimeout(resolve, 250));
  } catch {
    return null;
  }

  return null;
}

async function verifyTotp(user: User, totp: string) {
  if (!user.otpSecret) {
    return false;
  }

  return verifyTotpWithTolerance(user.otpSecret, totp);
}

const Users = {
  find,
  create,
  update,
  authenticate,
  isUsernameAvailable,
  verifyTotp,
};

export default Users;
export type User = typeof schema.users.$inferSelect;
export type UserWithTenant = User & {
  tenant: Tenant | null;
};
