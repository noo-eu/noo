import { Noo } from "@/components/Noo";
import { PageModal } from "@/components/PageModal";
import { useTranslations } from "next-intl";

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
