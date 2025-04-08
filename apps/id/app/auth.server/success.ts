import { uuidToHumanId } from "@noo/lib/humanIds";
import Tenants from "~/db.server/tenants";
import type { User } from "~/db.server/users.server";
import { getOidcAuthorizationClient } from "~/lib.server/oidc";
import {
  createSession,
  getAuthenticatedSession,
  reauthenticateSession,
} from "./sessions";

export async function handleSuccessfulAuthentication<Input>(
  request: Request,
  user: User,
  input: Input,
) {
  const oidcAuthorizationClient = await getOidcAuthorizationClient(request);
  if (oidcAuthorizationClient) {
    if (oidcAuthorizationClient.tenantId) {
      // The user must be in the same tenant as the client
      if (user.tenantId !== oidcAuthorizationClient.tenantId) {
        const tenant = await Tenants.find(oidcAuthorizationClient.tenantId);
        return {
          error: "tenant",
          input: { ...input, domain: tenant!.domain ?? tenant?.name },
        };
      }
    } else {
      // For the future: the client is public, if the user is in a tenant, we
      // need to make sure that the tenant allows public clients.
    }
  }

  const cookies = await startSession(request, user);

  if (!oidcAuthorizationClient) {
    return { data: "/", input: { ...input, domain: undefined }, cookies };
  }

  const uid = uuidToHumanId(user.id, "usr");
  return {
    data: `/oidc/consent?uid=${encodeURIComponent(uid)}`,
    input: { ...input, domain: undefined },
    cookies,
  };
}

export async function startSession(request: Request, user: User) {
  const session = await getAuthenticatedSession(request, user.id);
  if (session) {
    // Update the lastAuthenticatedAt timestamp, which is used for the OIDC auth_time claim
    return await reauthenticateSession(request, session.id);
  } else {
    return await createSession(request, user.id);
  }
}
