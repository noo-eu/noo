import { HttpRequest } from "@/lib/http/request";
import { composeMiddleware, cors, preventCache } from "@/lib/middlewares";
import { handleUserinfo } from "@noo/oidc-server/userinfo";

export async function GET(raw: Request) {
  const request = new HttpRequest(raw);
  return userinfoEndpoint(request);
}

export async function POST(raw: Request) {
  const request = new HttpRequest(raw);
  return userinfoEndpoint(request);
}

export const userinfoEndpoint = composeMiddleware(
  preventCache,
  cors(["GET", "POST"]),
  async (req: HttpRequest) => handleUserinfo(req.request),
);
