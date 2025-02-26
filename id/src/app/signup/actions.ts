"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignupService } from "@/services/SignupService";
import { cookies } from "next/headers";

function translateErrors(
  t: (key: string) => string,
  errors: Record<string, string>,
) {
  const result: Record<string, string> = {};

  for (const key in errors) {
    result[key] = t(errors[key]);
  }

  return result;
}

async function saveSignupData(data: Record<string, string>) {
  const cookieStore = await cookies();

  const existingData = await getSignupData();
  if (existingData) {
    data = { ...existingData, ...data };
  }

  const encodedData = Buffer.from(JSON.stringify(data)).toString("base64");
  cookieStore.set("signup", encodedData, {
    maxAge: 60 * 60,
  });
}

async function getSignupData() {
  const cookieStore = await cookies();
  const existingData = cookieStore.get("signup")?.value;
  if (!existingData) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(existingData, "base64").toString("utf-8"));
  } catch (e) {
    return null;
  }
}

export async function signupStep1(prevState: unknown, formData: FormData) {
  const svc = new SignupService(formData);
  const errors = await svc.runStep1();
  const t = await getTranslations("signup.errors");

  if (errors) {
    return {
      errors: translateErrors(t, errors),
      values: svc.params,
    };
  }

  await saveSignupData(svc.params);

  redirect("/signup/username");
}

export async function signupStep2(prevState: unknown, formData: FormData) {
  const svc = new SignupService(formData);
  const errors = await svc.runStep2();
  const t = await getTranslations("signup.errors");

  if (errors) {
    return {
      errors: translateErrors(t, errors),
      values: svc.params,
    };
  }

  await saveSignupData(svc.params);

  redirect("/signup/password");
}

export async function signupStep3(prevState: unknown, formData: FormData) {
  const svc = new SignupService(formData);
  const errors = await svc.runStep3();
  const t = await getTranslations("signup.errors");

  if (errors) {
    return {
      errors: translateErrors(t, errors),
      values: svc.params,
    };
  }

  await saveSignupData(svc.params);

  redirect("/signup/terms");
}

export async function signupStep4(_: unknown, formData: FormData) {
  const svc = new SignupService();

  const signupData = await getSignupData();
  if (!signupData) {
    redirect("/signup");
  }

  const errors = await svc.runStep4(signupData);
  if (errors) {
    redirect("/signup");
  }

  redirect("/signup/success");
}
