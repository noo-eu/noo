export function getClientIp(request: Request): string {
  const ipHeader = request.headers.get("x-forwarded-for") ?? "0.0.0.0";

  return ipHeader.split(",")[0];
}
