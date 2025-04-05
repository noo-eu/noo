import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";

export type PasswordRaterProps = {
  password: string;
  strength: number;
};

async function checkBreaches(password: string) {
  const response = await fetch("/private/passwords/breaches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate WebAuthn options");
  }

  return await response.json();
}

export function PasswordRater({
  password,
  strength,
}: Readonly<PasswordRaterProps>) {
  const { value: debouncedPassword, setValue: setDebouncedPassword } =
    useDebouncer(password, 500);

  const t = useTranslations("security.password.score");
  const [breaches, setBreaches] = useState(0);
  const prefix = t("prefix");

  useEffect(() => {
    setDebouncedPassword(password);
  }, [password, setDebouncedPassword]);

  useEffect(() => {
    if (debouncedPassword.length < 10) {
      return setBreaches(0);
    }

    checkBreaches(debouncedPassword).then((result) => {
      if (result.breaches > 0) {
        setBreaches(result.breaches);
      } else {
        setBreaches(0);
      }
    });
  }, [debouncedPassword]);

  if (!password || password.length === 0) {
    return <>{prefix}</>;
  }

  if (password.length > 0 && password.length < 10) {
    return (
      <>
        {prefix} {t("short")}
      </>
    );
  }

  if (breaches > 0) {
    return (
      <>
        {prefix} <span className="text-amber-700">{t("breached")}</span>
      </>
    );
  }

  return (
    <>
      {prefix}{" "}
      <span className="font-medium">
        {strength < 3 && <span className="text-amber-700">{t("weak")}</span>}
        {strength === 3 && (
          <span className="text-yellow-500">{t("acceptable")}</span>
        )}
        {strength === 4 && (
          <span className="text-green-600">{t("strong")}</span>
        )}
      </span>
    </>
  );
}

function useDebouncer<T>(initialValue: T, delay: number) {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return { value: debouncedValue, setValue };
}
