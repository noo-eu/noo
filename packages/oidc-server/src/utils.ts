import crypto from "node:crypto";
import configuration from "./configuration";

export function sha256(input: Buffer | string) {
  return crypto.createHash("sha256").update(input);
}

// A very convoluted way to get all the parameters from a request,
// whether they are in the query string or in the body.
export async function requestParams(
  req: Request,
): Promise<Record<string, string>> {
  const query = Object.fromEntries(new URL(req.url).searchParams);
  if (
    (req.method === "POST" &&
      req.headers
        .get("Content-Type")
        ?.startsWith("application/x-www-form-urlencoded")) ??
    false
  ) {
    const formData = await req.formData();
    const entries = formData.entries();
    const params: Record<string, string> = {};

    for (const [key, value] of entries) {
      const val = value.valueOf();
      if (typeof val === "string") {
        params[key] = val;
      } else {
        throw new Error("Form data value is not a string");
      }
    }

    return {
      ...query,
      ...params,
    };
  }

  return query;
}

export async function getActiveSessions(request: Request, maxAge?: number) {
  try {
    return await configuration.getActiveSessions(request, maxAge);
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return [];
  }
}
