import { PlusIcon } from "@heroicons/react/24/outline";
import { Button, Noo } from "@noo/ui";
import { useTranslations } from "use-intl";
import { ConfirmationProvider } from "~/components/Confirmation";
import ProfileLayout from "~/screens/home/ProfileLayout";
import type { ClientPasskey } from "~/types/ClientPasskey.client";
import { PasskeyItem } from "./PasskeyItem";
import { usePasskeyRegistration } from "./usePasskeyRegistration";

export function PasskeysPage({
  existingPasskeys,
}: Readonly<{ existingPasskeys: ClientPasskey[] }>) {
  const t = useTranslations("security.passkeys");

  const register = usePasskeyRegistration();
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await register();
    if (success) {
      window.location.reload();
    }
  };

  return (
    <ProfileLayout>
      <div className="flex flex-col max-w-3xl mx-auto p-4 w-full">
        <h1 className="text-4xl font-medium mt-12 mb-6 text-center">
          {t("title")}
        </h1>

        <p className="mb-8">{t.rich("description1", { noo: () => <Noo /> })}</p>

        <p className="mb-8">{t("description2")}</p>

        <form onSubmit={onSubmit} className="max-w-sm mx-auto">
          <Button type="submit" kind="plain">
            <PlusIcon className="h-5 w-5 mr-1" />
            {t("register")}
          </Button>
        </form>

        {existingPasskeys.length > 0 && (
          <div className="mt-8 border border-black/15 dark:border-white/25 rounded p-8">
            <h2 className="text-2xl font-medium mb-4">{t("yourPasskeys")}</h2>

            <ConfirmationProvider>
              <ul className="divide-y divide-black/15 dark:divide-white/25">
                {existingPasskeys.map((passkey) => (
                  <PasskeyItem passkey={passkey} key={passkey.id} />
                ))}
              </ul>
            </ConfirmationProvider>
          </div>
        )}
      </div>
    </ProfileLayout>
  );
}
