import { getTranslations } from "next-intl/server";
import { TotpScreen } from "@/screens/signin/totp/TotpScreen";
import { loadTotpSession } from "../actions";
import { redirect } from "next/navigation";
import Passkeys from "@/db/passkeys";
import { humanIdToUuid } from "@/utils";

export async function generateMetadata() {
  const t = await getTranslations("signin");

  return {
    title: t("metaTitle"),
    description: "",
  };
}

export default async function Page() {
  const userId = await loadTotpSession();
  if (!userId) {
    redirect("/signin");
  }

  const hasPasskeys =
    (await Passkeys.listForUser(humanIdToUuid(userId, "usr")!)).length > 0;

  return <TotpScreen hasPasskeys={hasPasskeys} />;
}
