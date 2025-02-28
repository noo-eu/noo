import { getPublicKeys } from "../jwks";

export async function GET() {
  const keys = await getPublicKeys();

  return Response.json({
    keys: [...keys.current, ...keys.legacy],
  });
}
