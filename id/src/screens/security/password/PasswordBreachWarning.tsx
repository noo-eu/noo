import { useAuth } from "@/auth/authContext";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

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
          <Link className="link" href={`https://help.noo.eu/`}>
            {children}
          </Link>
        ),
      })}
    </p>
  );
}
