"use client";

import { useActionState } from "react";
import { signupStep4 } from "../actions";
import { Button } from "@/components/Button";
import { useTranslations } from "next-intl";

export default function SignupPage() {
  const [_, formAction, pending] = useActionState(signupStep4, undefined);

  const t = useTranslations("signup");

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step4.title")}
      </h2>

      <div className="text-sm">
        {t.rich("step4.description", {
          noo: () => <strong className="noo">noo</strong>,
          p: (children) => <p className="mb-2">{children}</p>,
          terms: (children) => (
            <a href="/terms" target="_blank" className="text-blue-500">
              {children}
            </a>
          ),
          privacy: (children) => (
            <a href="/privacy" target="_blank" className="text-blue-500">
              {children}
            </a>
          ),
        })}
      </div>

      <form action={formAction} className="space-y-8">
        <div className="flex justify-end mt-12">
          <Button type="submit" pending={pending}>
            {t("step4.accept")}
          </Button>
        </div>
      </form>
    </>
  );
}
