export function makeCsp(nonce: string) {
  const isProduction = process.env.NODE_ENV === "production";

  // unsafe-inline is needed for styles until:
  //  - https://github.com/tailwindlabs/headlessui/issues/2615
  // However, this does not represent a real security risk:
  //  - https://scotthelme.co.uk/can-you-get-pwned-with-css/

  const cspHeader = `
    default-src 'self' https://static.noo.eu${!isProduction ? " ws: wss:" : ""};
    script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' https://static.noo.eu blob: data:;
    font-src 'self' https://static.noo.eu;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

  // Do not add "require-trusted-types-for 'script';""
  // until React and react-router have stepped up. At the moment
  // the work seems to be stuck.

  // Replace newline characters and spaces
  return cspHeader.replace(/\s{2,}/g, " ").trim();
}
