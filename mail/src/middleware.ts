import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // This allows us to access the request URL and search params in layouts and
  // i18n configuration.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-ssr-url", request.url);

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // unsafe-inline and https: are ignored in the presence of 'strict-dynamic' by
  // modern browsers, but help with compatibility with older browsers
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = `
    default-src 'self';
    script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:;
    style-src 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    require-trusted-types-for 'script';
`;
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, " ")
    .trim();

  requestHeaders.set("x-nonce", nonce);

  requestHeaders.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue,
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue,
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - the OIDC session check iframe
     */
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|oidc/[^/]+/session|/monitoring).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
