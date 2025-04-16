// Fallback handler used to send form_post responses that cannot be
// easily sent as redirects.

import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import FormPost from "~/screens/formPost";

export function headers() {
  return {
    "Content-Security-Policy": "form-action *",
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const queryParams = new URL(request.url).searchParams;
  const uri = queryParams.get("redirect_uri")!;
  const params = JSON.parse(queryParams.get("params") || "{}");

  return {
    redirectUri: uri,
    params: params,
  };
}

export default function Page() {
  const { redirectUri, params } = useLoaderData<typeof loader>();

  return <FormPost redirectUri={redirectUri} params={params} />;
}
