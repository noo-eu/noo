import { Middleware } from ".";
import { HttpRequest } from "../http/request";

export function cors(methods: string[]) {
  return async (request: HttpRequest, next?: Middleware) => {
    let response = new Response(null, { status: 204 });
    if (request.method !== "OPTIONS") {
      response = next
        ? await next(request)
        : Response.json({ error: "Not Found" }, { status: 404 });
    }

    if (response.headers.get("Access-Control-Allow-Origin")) {
      // The response already has CORS headers, return it as-is
      return response;
    }

    if (request.method === "OPTIONS" || methods.includes(request.method)) {
      const origin = request.headers["origin"] ?? "*";
      response.headers.set("Vary", "Origin");
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        Array.from(new Set(methods).add("OPTIONS")).join(", "),
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
    }

    return response;
  };
}
