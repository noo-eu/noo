"use server";

import { notFound } from "next/navigation";
import { afterConsent } from "../continue/actions";

export async function consentFormSubmit(_: unknown, formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  const consent = formData.get("consent") as string;
  if (consent !== "yes") {
    return notFound();
  }

  return afterConsent(sessionId);
}
