import { Button, PasswordField, TextField } from "@noo/ui";
import Link from "next/link";
import { Form, useActionData, useNavigation } from "react-router";
import { useTranslations } from "use-intl";

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

export function SignInForm() {
  const state = useActionData();
  const navigation = useNavigation();
  const isSubmitting = !!navigation.formAction;

  const t = useTranslations("signin");
  const passwordT = useTranslations("common.passwordField");

  // const authenticateWithWebauthn = useWebauthnAuthentication();

  // useEffect(() => {
  //   authenticateWithWebauthn(true).catch((e) => {
  //     console.warn(e);
  //   });
  // }, [authenticateWithWebauthn]);

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
        />
        <PasswordField
          label={t("password")}
          name="password"
          autoComplete="current-password"
          t={passwordT}
        />

        <div className="very-important-field">
          <label>1 + 1 =</label>
          <input type="text" name="captcha" />
        </div>

        <div className="flex justify-end items-center mt-12">
          <Link href="/signup" className="py-2.5 px-2 link font-medium me-4">
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

      {/* <Button
        className="mx-auto"
        size="sm"
        form="outline"
        onClick={() => authenticateWithWebauthn(false)}
      >
        {t("usePasskey")}
      </Button> */}
    </>
  );
}
