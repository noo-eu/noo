import { Middleware } from ".";
import { HttpRequest } from "../http/request";

export async function preventCache(request: HttpRequest, next?: Middleware) {
  const response = next
    ? await next(request)
    : Response.json({ error: "Not Found" }, { status: 404 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
