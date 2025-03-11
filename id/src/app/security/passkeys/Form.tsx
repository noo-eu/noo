"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@noo/ui";
import {
  PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";
import { registrationOptions, verifyRegistration } from "./actions";

export type PasskeysPageFormProps = {
  uid: string;
  existingPasskeys: {
    createdAt: Date;
    lastUsedAt: Date;
    id: string;
  }[];
};

export function PasskeysPageForm({ uid }: PasskeysPageFormProps) {
  const t = useTranslations("security.passkeys");

  const registerPasskey = async (e: React.FormEvent) => {
    e.preventDefault();

    const options = await registrationOptions(uid);
    if (options.error) {
      console.error("Error registering passkey:", options.error);
      return;
    }

    try {
      const registrationResponse = await startRegistration({
        optionsJSON: options.data as PublicKeyCredentialCreationOptionsJSON,
      });
      await verifyRegistration(uid, registrationResponse);
    } catch (error) {
      console.error("Error registering passkey:", error);
    }
  };

  return (
    <div className="flex flex-col max-w-3xl mx-auto p-4 w-full">
      <h1 className="text-4xl font-medium mt-12 mb-6 text-center">
        {t("title")}
      </h1>

      <p className="mb-8">{t("description1")}</p>

      <p className="mb-8">{t("description2")}</p>

      <form onSubmit={registerPasskey} className="max-w-sm mx-auto">
        <Button type="submit">
          <PlusIcon className="h-5 w-5 mr-1" />
          {t("register")}
        </Button>
      </form>
    </div>
  );
}
