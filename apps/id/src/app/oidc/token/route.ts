import { HttpRequest } from "@/lib/http/request";
import { tokenEndpoint } from "../utils";

export async function POST(raw: Request) {
  const request = new HttpRequest(raw);
  return await tokenEndpoint(request);
}
