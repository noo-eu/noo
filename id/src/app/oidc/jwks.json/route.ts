import { getPublicKeys } from "../jwks";

export async function GET() {
  const keys = await getPublicKeys();

  return Response.json(
    {
      keys: [...keys.current, ...keys.legacy],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
