import { Button, PasswordField, TextField } from "@noo/ui";
import {
  startAuthentication,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useEffect } from "react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { useTranslations } from "use-intl";

async function generateWebauthnOptions() {
  const response = await fetch("/private/webauthn/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to generate WebAuthn options");
  }

  return await response.json();
}

async function verifyWebauthn(
  passkeyChallengeId: string,
  authResponse: AuthenticationResponseJSON,
) {
  const response = await fetch("/private/webauthn/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ passkeyChallengeId, authResponse }),
  });

  if (!response.ok) {
    throw new Error("Failed to start authentication");
  }

  return await response.json();
}

export function useWebauthnAuthentication() {
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
        window.location.href = verifyResp.data;
      }
    } catch (e) {
      console.warn(e);
    }
  };
}

export function SignInForm() {
  const state = useActionData();
  const navigation = useNavigation();
  const isSubmitting = !!navigation.formAction;

  const t = useTranslations("signin");
  const passwordT = useTranslations("common.passwordField");

  const authenticateWithWebauthn = useWebauthnAuthentication();

  useEffect(() => {
    authenticateWithWebauthn(true).catch((e) => {
      console.warn(e);
    });
  }, [authenticateWithWebauthn]);

  return (
    <>
      {state?.error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
          {state.error == "credentials" && t("error")}
          {state.error == "tenant" &&
            t("tenant_error", { domain: state.input.domain! })}
        </div>
      )}
      <Form method="POST" className="space-y-8">
        <TextField
          label={t("username")}
          name="username"
          defaultValue={state?.input.username}
          autoComplete="username webauthn"
          focusOnLoad
        />
        <PasswordField
          label={t("password")}
          name="password"
          autoComplete="current-password"
          t={passwordT}
        />

        <div className="very-important-field">
          <label htmlFor="captcha">1 + 1 =</label>
          <input type="text" id="captcha" name="captcha" />
        </div>

        <div className="flex justify-end items-center mt-12">
          <Link to="/signup" className="py-2.5 px-2 link font-medium me-4">
            {t("create_account")}
          </Link>
          <Button
            type="submit"
            pending={isSubmitting}
            data-testid="signinSubmit"
          >
            {t("submit")}
          </Button>
        </div>
      </Form>

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
