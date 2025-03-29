import { HttpRequest } from "@/lib/http/request";
import { composeMiddleware, cors, preventCache } from "@/lib/middlewares";
import { handleTokenRequest } from "@noo/oidc-server/token/request";

export async function POST(raw: Request) {
  const request = new HttpRequest(raw);
  return await tokenEndpoint(request);
}

export const tokenEndpoint = composeMiddleware(
  preventCache,
  cors(["POST"]),
  (req) => {
    return handleTokenRequest(req.request);
  },
);
