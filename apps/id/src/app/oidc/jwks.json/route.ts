import { allPublicKeys } from "@/lib/jwks/store";

export async function GET() {
  const keys = await allPublicKeys();

  return Response.json(
    { keys },
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
