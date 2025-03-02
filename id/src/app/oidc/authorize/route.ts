import { NextRequest } from "next/server";
import { oidcAuthorization } from "../authorization";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const parameters = Object.fromEntries(request.nextUrl.searchParams);
  return oidcAuthorization(parameters, null, request);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const formData = await request.formData();
  const parameters: Record<string, string> = {};
  formData.forEach((value, key) => {
    parameters[key] = value.toString();
  });

  return oidcAuthorization(parameters, null, request);
}
