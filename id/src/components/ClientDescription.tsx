"use client";

import { useTranslations } from "next-intl";

type Props = {
  name: string;
  descriptionKey?: string;
};

export function ClientDescription({ name, descriptionKey }: Props) {
  const t = useTranslations("oidc");

  return t.rich(descriptionKey || "switch.description", {
    name,
    details: (children) => (
      <a
        className="font-medium link cursor-pointer"
        onClick={() => alert("TODO")}
      >
        {children}
      </a>
    ),
  });
}
