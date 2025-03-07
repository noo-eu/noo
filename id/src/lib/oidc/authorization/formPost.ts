import { i18nConfig } from "@/i18n/request";
import { randomSalt } from "@/utils";
import { createTranslator } from "next-intl";

export async function buildFormPostResponse(
  redirectUri: string,
  data: Record<string, string | undefined>,
) {
  const params = Object.entries(data).filter(
    ([_, value]) => value !== undefined,
  );

  const cspNonce = randomSalt(8, "base64url");
  const cspHeader = `default-src 'self'; script-src 'nonce-${cspNonce}'; style-src 'nonce-${cspNonce}';`;

  const t = createTranslator(await i18nConfig());

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
        <form method="post" action="${redirectUri}">
          ${params.map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`).join("")}
          <noscript>
            <button type="submit" id="submit">${t("common.continue")}</button>
          </noscript>
        </form>
      </body>
    </html>
  `;

  return new Response(form, {
    headers: {
      "Content-Type": "text/html",
      "Content-Security-Policy": cspHeader,
    },
  });
}
