import { handleTokenRequest } from "~/lib.server/oidcServer";

export function loader({ request }: { request: Request }) {
  // This only exists for the OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Cache-Control": "no-store",
      },
    });
  } else {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "OPTIONS, POST",
      },
    });
  }
}

export async function action({ request }: { request: Request }) {
  const response = await handleTokenRequest(request);

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "OPTIONS,POST");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );

  return response;
}
