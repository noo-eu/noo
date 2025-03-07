import { Noo } from "@/components/Noo";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function PresentNoo() {
  const t = await getTranslations("signin");

  return (
    <div>
      <Image
        src="/favicon.svg"
        alt="noo"
        className="w-16 h-16 mb-8"
        width={64}
        height={64}
      />
      <h1 className="text-2xl mb-8">{t.rich("title", { noo: Noo })}</h1>
    </div>
  );
}
