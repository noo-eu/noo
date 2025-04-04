import { Noo } from "@noo/ui/Noo";
import { Outlet } from "react-router";
import { useTranslations } from "use-intl";
import { PageModal } from "~/components/PageModal";

export default function SignupLayout() {
  const t = useTranslations();

  return (
    <PageModal className="!max-w-lg">
      <PageModal.Modal className="max-w-lg mx-auto !block">
        <h1 className="text-4xl text-center mb-8">
          {t.rich("signup.create_your_account", { noo: () => <Noo /> })}
        </h1>

        <Outlet />
      </PageModal.Modal>
    </PageModal>
  );
}
