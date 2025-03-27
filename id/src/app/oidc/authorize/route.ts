import { HttpRequest } from "@/lib/http/request";
import { buildFormPostResponse } from "@/lib/oidc/authorization/formPost";
import { performOidcAuthorization } from "@noo/oidc-server/authorization/request";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const httpRequest = new HttpRequest(request);
  return oidcAuthorization(httpRequest);
}

export async function POST(request: NextRequest) {
  const httpRequest = new HttpRequest(request);
  return oidcAuthorization(httpRequest);
}

export async function oidcAuthorization(request: HttpRequest) {
  const result = await performOidcAuthorization(await request.params);
  if (result.isErr()) {
    return fatalError(request.baseUrl, result.error);
  }

  const response = result.value;
  switch (response.nextStep) {
    case "REDIRECT":
      return Response.redirect(response.url!, 303);
    case "FORM_POST":
      return buildFormPostResponse(
        response.params.redirect_uri,
        response.data!,
      );
    case "SELECT_ACCOUNT":
      redirect("/switch");
    case "SIGN_IN":
      redirect("/signin");
    case "CONFIRM":
      redirect(`/confirm?uid=${response.userId!}`);
    case "CONSENT":
      redirect(`/consent?uid=${response.userId!}`);
  }
}

function fatalError(baseUrl: string, error: string) {
  return Response.redirect(`${baseUrl}/oidc/fatal?error=${error}`, 303);
}
