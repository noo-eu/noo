import { Noo } from "@/components/Noo";
import { PageModal } from "@/components/PageModal";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("signup");

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
  const t = useTranslations();

  return (
    <PageModal className="!max-w-lg">
      <PageModal.Modal className="max-w-lg mx-auto !block">
        <h1 className="text-4xl text-center mb-8">
          {t.rich("signup.create_your_account", { noo: () => <Noo /> })}
        </h1>

        {children}
      </PageModal.Modal>
    </PageModal>
  );
}
