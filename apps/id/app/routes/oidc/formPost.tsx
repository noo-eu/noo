// Fallback handler used to send form_post responses that cannot be
// easily sent as redirects.

import type { LoaderFunctionArgs } from "react-router";
import { buildFormPostResponse } from "~/lib.server/formPost";
import { localeContext } from "~/root";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const queryParams = new URL(request.url).searchParams;
  const uri = queryParams.get("redirect_uri")!;
  const params = JSON.parse(queryParams.get("params") || "{}");
  const t = context.get(localeContext).makeT();

  return await buildFormPostResponse(uri, params, t);
}
