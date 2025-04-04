import { Link } from "react-router";
import { useFormatter, useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";

export function PasswordBreachWarning() {
  const user = useAuth();
  const t = useTranslations("security");
  const format = useFormatter();

  return (
    <p className="mb-4 text-sm text-amber-600 border border-amber-600 p-3 rounded-md">
      {t.rich("password.breaches", {
        count: format.number(user.passwordBreaches!),
        otp: user.hasOtp ? "true" : "false",
        guide: (children) => (
          <Link className="link" to={`https://help.noo.eu/`}>
            {children}
          </Link>
        ),
      })}
    </p>
  );
}
