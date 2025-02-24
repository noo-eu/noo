export function buildConfiguration(request: Request, domain?: string) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const issuer = `${proto}://${host}/oidc` + (domain ? `/${domain}` : "");

  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${proto}://${host}/oidc/jwks.json`,
    response_types_supported: ["code", "id_token", "token id_token"],
    subject_types_supported: ["public", "pairwise"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email"],
    claims_supported: ["sub"],
  };
}
