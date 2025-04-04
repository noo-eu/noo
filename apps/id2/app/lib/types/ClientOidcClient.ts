import { uuidToHumanId } from "@noo/lib/humanIds";
import type { OidcClient } from "~/db/oidc_clients";

export type ClientOidcClient = {
  id: string;
  clientName?: string;
  logoUri?: string;
  tosUri?: string;
};

export function makeClientOidcClient(
  oidcClient: OidcClient,
  locale: string,
): ClientOidcClient {
  return {
    id: uuidToHumanId(oidcClient.id, "oidc"),
    clientName: getLocalizedOidcField(oidcClient, "clientName", locale),
    logoUri: getLocalizedOidcField(oidcClient, "logoUri", locale),
    tosUri: getLocalizedOidcField(oidcClient, "tosUri", locale),
  };
}

type LocalizedField =
  | "clientName"
  | "clientUri"
  | "policyUri"
  | "tosUri"
  | "logoUri";

function getLocalizedOidcField(
  client: OidcClient,
  field: LocalizedField,
  preferredLocale: string,
) {
  const localizedField = client[field] as Record<string, string>;
  if (!localizedField) {
    return undefined;
  }

  if (localizedField[preferredLocale]) {
    return localizedField[preferredLocale];
  } else if (localizedField[""]) {
    return localizedField[""];
  } else if (Object.keys(localizedField).length > 0) {
    return Object.values(localizedField)[0];
  }

  return undefined;
}
