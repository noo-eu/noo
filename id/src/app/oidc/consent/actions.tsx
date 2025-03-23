"use server";

import { notFound } from "next/navigation";
import { afterConsent } from "../continue/actions";

export async function consentFormSubmit(_: unknown, formData: FormData) {
  const userId = formData.get("userId") as string;
  const consent = formData.get("consent") as string;
  if (consent !== "yes") {
    return notFound();
  }

  return afterConsent(userId);
}
