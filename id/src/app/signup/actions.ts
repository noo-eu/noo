"use server";

import { schema } from "@/db";
import { getIpAddress, getUserAgent } from "@/lib/http/nextUtils";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import {
  getSessionCookie,
  SESSION_COOKIE_NAME,
  SessionsService,
} from "@/lib/SessionsService";
import { SignupService } from "@/lib/SignupService";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
  } catch {
    return null;
  }
}

export async function signupStep1(prevState: unknown, formData: FormData) {
  const svc = new SignupService(formData);
  const errors = await svc.runStep1();

  if (errors) {
    const t = await getTranslations("profile.name.errors");
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

  if (errors) {
    const t = await getTranslations("signup.errors");
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

  if (errors) {
    const t = await getTranslations("signup.errors");
    return {
      errors: translateErrors(t, errors),
      values: svc.params,
    };
  }

  await saveSignupData(svc.params);

  redirect("/signup/terms");
}

async function startSession(user: typeof schema.users.$inferSelect) {
  const cookieStore = await cookies();
  const sessionManager = new SessionsService(await getSessionCookie());

  const session = await sessionManager.startSession(
    user.id,
    await getIpAddress(),
    await getUserAgent(),
  );

  // Delete old, expired, tampered sessions
  await sessionManager.cleanup();

  cookieStore.set(SESSION_COOKIE_NAME, sessionManager.buildCookie(), {
    maxAge: 60 * 60 * 24 * 400,
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return session;
}

export async function signupStep4(_: unknown, __: FormData) {
  const svc = new SignupService();

  const signupData = await getSignupData();

  // Whatever the result, we won't need the signup data anymore
  const cookieStore = await cookies();
  cookieStore.set("signup", "", { maxAge: 0 });

  if (!signupData) {
    redirect("/signup");
  }

  const result = await svc.runStep4(signupData);
  if (result.success) {
    const session = await startSession(result.user);

    const oidcAuthorization = await getOidcAuthorizationRequest();
    if (oidcAuthorization) {
      redirect("/oidc/consent?sid=" + session.id);
    } else {
      redirect("/signup/success");
    }
  } else {
    redirect("/signup");
  }
}
