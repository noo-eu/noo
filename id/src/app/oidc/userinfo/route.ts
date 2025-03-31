import { HttpRequest } from "@/lib/http/request";
import { userinfoEndpoint } from "../utils";

export async function GET(raw: Request) {
  const request = new HttpRequest(raw);
  return userinfoEndpoint(request);
}

export async function POST(raw: Request) {
  const request = new HttpRequest(raw);
  return userinfoEndpoint(request);
}
