import { Button, PasswordField, TextField } from "@noo/ui";
import {
  startAuthentication,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useEffect, useRef, useState } from "react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { useTranslations } from "use-intl";
import PowWorker from "~/routes/pow-worker.ts?worker";

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

export function SignInForm({ powRequest }: { powRequest: string | undefined }) {
  const state = useActionData();
  const navigation = useNavigation();

  const t = useTranslations("signin");
  const passwordT = useTranslations("common.passwordField");

  const authenticateWithWebauthn = useWebauthnAuthentication();

  const [powNonce, setPowNonce] = useState<string>("");
  const [isPowRunning, setIsPowRunning] = useState<boolean>(false);
  const [awaitingPowForSubmit, setAwaitingPowForSubmit] =
    useState<boolean>(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = !!navigation.formAction || awaitingPowForSubmit;

  useEffect(() => {
    setPowNonce("");
    setIsPowRunning(false);
    setAwaitingPowForSubmit(false);
    if (!powRequest) {
      return;
    }

    setIsPowRunning(true);
    const worker = new PowWorker();

    worker.onmessage = (event) => {
      const { nonce } = event.data;
      if (nonce) {
        setPowNonce(nonce);
      }

      setIsPowRunning(false);
    };

    worker.postMessage(powRequest);

    return () => {
      worker.terminate();
      setIsPowRunning(false);
      setAwaitingPowForSubmit(false);
    };
  }, [powRequest]);

  useEffect(() => {
    // authenticateWithWebauthn(true).catch((e) => {
    //   console.warn(e);
    // });
  }, [authenticateWithWebauthn]);

  // Effect to automatically submit the form once PoW nonce is ready
  // if the form is waiting for it
  useEffect(() => {
    // Check if we were waiting for PoW and the nonce is now available and the form exists
    if (awaitingPowForSubmit && powNonce && formRef.current) {
      setAwaitingPowForSubmit(false);
      formRef.current.requestSubmit();
    }
  }, [powNonce, awaitingPowForSubmit]);

  const handleSubmitClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Check if PoW is required, is currently running, and we don't have the nonce yet
    if (powRequest && isPowRunning && !powNonce) {
      event.preventDefault();
      setAwaitingPowForSubmit(true);
    } else {
      // PoW not needed, or already finished. Let the default submission proceed.
    }
  };

  return (
    <>
      {state?.error && (
        <div
          className="bg-red-100 text-red-800 p-4 rounded mb-6"
          data-testid="signinErrorMessage"
        >
          {state.error == "credentials" && t("error")}
          {state.error == "tenant" &&
            t("tenant_error", { domain: state.input.domain! })}
          {state.error == "pow_invalid" || state.error == "pow_missing"
            ? t("error")
            : ""}
        </div>
      )}
      <Form method="POST" className="space-y-8" ref={formRef}>
        {powRequest && (
          <>
            <input type="hidden" name="powNonce" value={powNonce} />
            <input type="hidden" name="powRequest" value={powRequest} />
          </>
        )}

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
            onClick={handleSubmitClick}
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
        data-testid="signinPasskey"
      >
        {t("usePasskey")}
      </Button>
    </>
  );
}
