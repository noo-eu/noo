import { Button, TextField } from "@noo/ui";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { useFormatter, useNow, useTranslations } from "use-intl";
import { useWebauthnAuthentication } from "../SignInForm";

export function TotpForm({ hasPasskeys }: { hasPasskeys: boolean }) {
  const t = useTranslations("signin");
  const commonT = useTranslations("common");
  const format = useFormatter();
  const navigation = useNavigation();
  const pending = !!navigation.formAction;

  const state = useActionData();

  const authenticateWithWebauthn = useWebauthnAuthentication();

  const now = useNow({
    updateInterval: 1000,
  });

  return (
    <>
      <p className="mb-4">{t("totpDescription")}</p>
      {state?.error && (
        <div
          className="bg-red-100 text-red-800 p-4 rounded mb-6"
          data-testid="signinTotpErrorMessage"
        >
          {state.error.code == "invalid_totp" && t("error")}
          {state.error.code == "rate_limit" &&
            now <= state.error.lockedUntil && (
              <p>
                {t("rateLimit", {
                  time: format.relativeTime(state.error.lockedUntil, {
                    style: "narrow",
                    now,
                  }),
                })}
              </p>
            )}
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
          <label htmlFor="captcha">1 + 1 =</label>
          <input type="text" id="captcha" name="captcha" />
        </div>

        <div className="flex justify-end items-center mt-12">
          <Link to="/signin" className="py-2.5 px-2 link font-medium me-4">
            {commonT("back")}
          </Link>
          <Button type="submit" pending={pending} data-testid="totpSubmit">
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

          <Button
            className="mx-auto"
            size="sm"
            form="outline"
            onClick={() => authenticateWithWebauthn(false)}
          >
            {t("usePasskey")}
          </Button>
        </>
      )}
    </>
  );
}
