import crypto from "node:crypto";
import { encode } from "he";

export async function buildFormPostResponse(
  redirectUri: string,
  data: Record<string, string | undefined>,
  t: (key: string) => string,
) {
  const params = Object.entries(data).filter(
    ([_, value]) => value !== undefined,
  ) as [string, string][];

  const cspNonce = crypto.randomBytes(8).toString("base64url");
  const cspHeader = `default-src 'self'; script-src 'nonce-${cspNonce}'; style-src 'nonce-${cspNonce}';`;

  // We have to render a form that will automatically submit itself to the
  // redirect_uri with the data as form parameters. We also have to provide a
  // fallback button for users with JavaScript disabled.
  const form = `
    <html>
      <head>
        <title>Redirecting...</title>
        <style nonce="${cspNonce}">
          #submit {
            color: white;
            cursor: pointer;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            background-color: #2563EB;
            border-radius: 0.375rem;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }
          #submit:hover {
            background-color: #3B82F6;
          }
        </style>
        <script nonce="${cspNonce}">
          document.addEventListener("DOMContentLoaded", function() {
            document.forms[0].submit();
          });
        </script>
      </head>
      <body>
        <form method="POST" action="${encode(redirectUri)}">
          ${params.map(([key, value]) => `<input type="hidden" name="${encode(key)}" value="${encode(value)}">`).join("")}
          <noscript>
            <button type="submit" id="submit">${t("common.continue")}</button>
          </noscript>
        </form>
      </body>
    </html>
  `;

  return new Response(form, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": cspHeader,
    },
  });
}
