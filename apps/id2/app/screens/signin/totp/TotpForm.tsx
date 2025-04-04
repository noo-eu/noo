import { Button, TextField } from "@noo/ui";
import Link from "next/link";
import { Form, useActionData, useNavigation } from "react-router";
import { useTranslations } from "use-intl";
import { action } from "~/routes/signin.otp";

// function useWebauthnAuthentication() {
//   return async (autofill: boolean) => {
//     try {
//       const { options, passkeyChallengeId } = await generateWebauthnOptions();
//       const authResponse = await startAuthentication({
//         optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
//         useBrowserAutofill: autofill,
//       });
//       const verifyResp = await verifyWebauthn(passkeyChallengeId, authResponse);
//       if ("error" in verifyResp) {
//         console.error(verifyResp.error);
//       } else {
//         redirect(verifyResp.data);
//       }
//     } catch (e) {
//       console.warn(e);
//     }
//   };
// }

export function TotpForm({ hasPasskeys }: { hasPasskeys: boolean }) {
  const t = useTranslations("signin");
  const commonT = useTranslations("common");
  const state = useActionData<typeof action>();
  const navigation = useNavigation();
  const pending = !!navigation.formAction;

  // const authenticateWithWebauthn = useWebauthnAuthentication();

  return (
    <>
      <p>{t("totpDescription")}</p>
      {state?.error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
          {state.error.totp == "credentials" && t("error")}
        </div>
      )}
      <Form method="POST" className="space-y-8">
        <TextField
          label={t("totpCode")}
          id="totp"
          name="totp"
          defaultValue={state?.input.username}
          autoComplete="one-time-code"
        />

        <div className="very-important-field">
          <label>1 + 1 =</label>
          <input type="text" name="captcha" />
        </div>

        <div className="flex justify-end items-center mt-12">
          <Link href="/signin" className="py-2.5 px-2 link font-medium me-4">
            {commonT("back")}
          </Link>
          <Button type="submit" pending={pending} data-testid="signinSubmit">
            {t("submit")}
          </Button>
        </div>
      </Form>

      {hasPasskeys && (
        <>
          <div className="flex items-center justify-center my-8 relative">
            <hr className="dark:border-white/20 w-full" />
            <span className="mx-4 text-sm text-gray-500 dark:text-gray-400 absolute bg-white dark:bg-black px-2">
              {t("or")}
            </span>
          </div>

          {/* <Button
            className="mx-auto"
            size="sm"
            form="outline"
            onClick={() => authenticateWithWebauthn(false)}
          >
            {t("usePasskey")}
          </Button> */}
        </>
      )}
    </>
  );
}
