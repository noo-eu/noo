import { allPublicKeys } from "~/lib.server/jwks/store";

export async function loader() {
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
