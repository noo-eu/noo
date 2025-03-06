import { OidcClient } from "@/db/oidc_clients";

type LocalizedField =
  | "clientName"
  | "clientUri"
  | "policyUri"
  | "tosUri"
  | "logoUri";
export function getLocalizedOidcField(
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

export function getClientName(client: OidcClient, preferredLocale: string) {
  const name = getLocalizedOidcField(client, "clientName", preferredLocale);
  if (name) {
    return name;
  }

  // Fallback to redirect URI host
  return new URL(client.redirectUris[0]).hostname;
}
