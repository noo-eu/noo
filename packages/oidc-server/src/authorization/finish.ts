import type { AuthorizationRequest } from "../types";
import type { AuthorizationResult } from "./request";

function returnUrl(
  response_mode: "query" | "fragment",
  redirect_uri: string,
  data: Record<string, string>,
) {
  switch (response_mode) {
    case "query": {
      const url = new URL(redirect_uri);

      // Add each key-value pair from the data object to the URL's search parameters
      Object.entries(data).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      // Redirect the user to the URL
      return url.toString();
    }
    case "fragment": {
      const url = new URL(redirect_uri);

      // Add each key-value pair from the data object to the URL's hash
      Object.entries(data).forEach(([key, value]) => {
        // encodeURIComponent is used to ensure that the value is properly encoded
        url.hash += `${key}=${encodeURIComponent(value)}&`;
      });

      // Remove the trailing "&" character
      if (url.hash.endsWith("&")) {
        url.hash = url.hash.slice(0, -1);
      }

      // Redirect the user to the URL
      return url.toString();
    }
  }
}

export async function returnToClient(
  params: AuthorizationRequest,
  data: Record<string, string | undefined>,
): Promise<AuthorizationResult> {
  // Remove any key-value pairs from the data object where the value is undefined
  const clean = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined),
  ) as Record<string, string>;

  if (params.state) {
    clean.state = params.state;
  }

  switch (params.response_mode) {
    case "query":
    case "fragment":
      return {
        params,
        nextStep: "REDIRECT",
        url: returnUrl(params.response_mode, params.redirect_uri, clean),
      };
    case "form_post":
      return { params, nextStep: "FORM_POST", data: clean };
  }
}
