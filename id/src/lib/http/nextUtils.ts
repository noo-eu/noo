import { headers } from "next/headers";

export async function getIpAddress() {
  const headerStore = await headers();
  const ipHeader =
    headerStore.get("x-real-ip") ??
    headerStore.get("x-forwarded-for") ??
    "0.0.0.0";
  return ipHeader.split(",")[0];
}

export async function getUserAgent() {
  const headerStore = await headers();
  return headerStore.get("user-agent") ?? "";
}
