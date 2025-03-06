import { PageModal } from "@/components/PageModal";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("signin");

  return {
    title: t("metaTitle"),
    description: "",
  };
}

export default function SignupPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PageModal>{children}</PageModal>;
}
