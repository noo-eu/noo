import "@/lib/oidc/setup";
import { discoveryMetadata } from "@noo/oidc-server/discovery";

export function GET(raw: Request) {
  return Response.json(discoveryMetadata());
}
