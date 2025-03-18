import Image from "@/components/Image";
import { useTranslations } from "next-intl";
import { Noo } from "./Noo";

export function SignInWithNoo() {
  const t = useTranslations("oidc");

  return (
    <h1 className="mb-8 sm:mb-4 ms-8 sm:ms-4 font-medium flex gap-2 items-center text-lg">
      <Image
        src="/favicon.svg"
        className="w-8 inline-block"
        alt="noo"
        width={32}
        height={32}
      />
      <span>{t.rich("switch.pageTitle", { noo: () => <Noo /> })}</span>
    </h1>
  );
}
