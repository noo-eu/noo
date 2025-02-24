export function buildConfiguration(request: Request, domain?: string) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const issuer = `${proto}://${host}/oidc` + (domain ? `/${domain}` : "");

  return {
    issuer,
  };
}
