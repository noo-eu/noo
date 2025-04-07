export function makeCsp(nonce: string) {
  const isProduction = process.env.NODE_ENV === "production";

  const cspHeader = `
    default-src 'self' https://static.noo.eu${!isProduction ? " ws:" : ""};
    script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:;
    style-src 'nonce-${nonce}';
    img-src 'self' https://static.noo.eu blob: data:;
    font-src 'self' https://static.noo.eu;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;
  // Replace newline characters and spaces
  return cspHeader.replace(/\s{2,}/g, " ").trim();
}
