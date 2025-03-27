"use client";
import { signin } from "@/app/signin/actions";
import { generateWebauthnOptions, verifyWebauthn } from "@/app/signin/webauthn";
import { Button, PasswordField, TextField } from "@noo/ui";
import {
  PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useActionState, useEffect } from "react";

function useWebauthnAuthentication() {
  return async (autofill: boolean) => {
    try {
      const { options, passkeyChallengeId } = await generateWebauthnOptions();
      const authResponse = await startAuthentication({
        optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
        useBrowserAutofill: autofill,
      });
      const verifyResp = await verifyWebauthn(passkeyChallengeId, authResponse);
      if ("error" in verifyResp) {
        console.error(verifyResp.error);
      } else {
        redirect(verifyResp.data);
      }
    } catch (e) {
      console.warn(e);
    }
  };
}

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signin, {
    input: { username: "" },
  });

  const t = useTranslations("signin");

  const authenticateWithWebauthn = useWebauthnAuthentication();

  useEffect(() => {
    authenticateWithWebauthn(true).catch((e) => {
      console.warn(e);
    });
  }, [authenticateWithWebauthn]);

  return (
    <>
      {state.error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
          {state.error == "credentials" && t("error")}
          {state.error == "tenant" &&
            t("tenant_error", { domain: state.input.domain! })}
        </div>
      )}
      <form action={formAction} className="space-y-8">
        <TextField
          label={t("username")}
          name="username"
          defaultValue={state.input.username}
          autoComplete="username webauthn"
        />
        <PasswordField
          label={t("password")}
          name="password"
          autoComplete="current-password"
        />

        <div className="very-important-field">
          <label>1 + 1 =</label>
          <input type="text" name="captcha" />
        </div>

        <div className="flex justify-end items-center mt-12">
          <Link href="/signup" className="py-2.5 px-2 link font-medium me-4">
            {t("create_account")}
          </Link>
          <Button type="submit" pending={pending} data-testid="signinSubmit">
            {t("submit")}
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-center my-8 relative">
        <hr className="dark:border-white/20 w-full" />
        <span className="mx-4 text-sm text-gray-500 dark:text-gray-400 absolute bg-white dark:bg-black px-2">
          {t("or")}
        </span>
      </div>

      <Button
        className="mx-auto"
        size="sm"
        form="outline"
        onClick={() => authenticateWithWebauthn(false)}
      >
        {t("usePasskey")}
      </Button>
    </>
  );
}
