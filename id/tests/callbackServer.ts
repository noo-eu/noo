Bun.serve({
  port: 22999,
  routes: {
    "/cb": async (req: Request) => {
      const method = req.method;
      const params = new URLSearchParams(req.url.split("?")[1]);
      const formParams =
        method === "POST" ? new URLSearchParams(await req.text()) : null;
      const headers = req.headers;

      const response = {
        method,
        url: req.url,
        query: Object.fromEntries(params),
        formParams: formParams ? Object.fromEntries(formParams) : null,
        headers: Object.fromEntries(headers),
      };

      console.log("=== OIDC Test Callback ===");
      console.log(response);

      return Response.json(response);
    },
  },
  tls: {
    key: Bun.file("certificates/localhost-key.pem"),
    cert: Bun.file("certificates/localhost.pem"),
  },
});
