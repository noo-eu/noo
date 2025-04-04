// This is the check session iframe page. It doesn't make sense to make this
// work as part of the React router app, with all it's chunking and
// optimization. Just a simple, fast page with no dependencies.

const PAGE = `
<!DOCTYPE html>
<html>
  <head>
    <title>noo OIDC - Session Check</title>
    <meta charset="utf-8" />
    <script>
      async function sha256(plain) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        const buf = await window.crypto.subtle.digest("SHA-256", data);

        // Convert to base64url
        return btoa(String.fromCharCode(...new Uint8Array(buf)))
          .replace(/\\+/g, "-")
          .replace(/\\//g, "_")
          .replace(/=+$/, "");
      }

      async function receiveMessage(e) {
        // e.data has client_id and session_state
        const client_id = e.data.substr(0, e.data.lastIndexOf(" "));
        const session_state = e.data.substr(e.data.lastIndexOf(" ") + 1);

        if (client_id === undefined || session_state === undefined) {
          postMessage("error", { targetOrigin: e.origin });
          return;
        }

        const salt = session_state.split(".")[1];
        if (salt === undefined) {
          postMessage("error", { targetOrigin: e.origin });
          return;
        }

        // The opuas is the value of the "_noo_auth_check" cookie
        // at the OP. The cookie value is opaque to the RP.
        const opuas =
          document.cookie
            .split("; ")
            .find((row) => row.startsWith("_noo_auth_check"))
            ?.split("=")[1] ?? "";

        const state = client_id + " " + e.origin + " " + opuas + " " + salt;

        // Here, the session_state is calculated in this particular way,
        // but it is entirely up to the OP how to do it under the
        // requirements defined in this specification.
        const ss =
          (await sha256(client_id + " " + e.origin + " " + opuas + " " + salt)) +
          "." +
          salt;

        const update = session_state === ss ? "unchanged" : "changed";
        e.source?.postMessage(update, { targetOrigin: e.origin });
      }

      window.addEventListener("message", receiveMessage, false);
    </script>
  </head>
  <body></body>
</html>
`;

export function loader() {
  return new Response(PAGE, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
