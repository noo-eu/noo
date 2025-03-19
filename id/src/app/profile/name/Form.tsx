"use client";

import { Noo } from "@/components/Noo";
import { PageModal } from "@/components/PageModal";
import ProfileLayout from "@/components/Profile/ProfileLayout";
import { capitalizeName } from "@/lib/name";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { Button, TextField } from "@noo/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { redirect } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "react-toastify/unstyled";
import { updateName } from "../actions";
import { useAuth } from "@/lib/authContext";

export function Form() {
  const user = useAuth();

  const [state, action, isPending] = useActionState(
    updateName.bind(null, user.id),
    {
      data: { success: false },
      input: { firstName: user.firstName, lastName: user.lastName },
    },
  );

  const [firstName, setFirstName] = useState(state.input.firstName);
  const [lastName, setLastName] = useState(state.input.lastName);

  const t = useTranslations("profile");
  const commonT = useTranslations("common");

  useEffect(() => {
    if (state.data?.success) {
      // Redirect to the profile page
      toast.success(t("name.updateSuccess"));
      redirect(`/profile?uid=${user.id}`);
    }
  }, [state.data, t, user.id]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const fn = capitalizeName(firstName);
    const ln = capitalizeName(lastName || "");

    setFirstName(fn);
    setLastName(ln);

    const data = new FormData();
    data.append("firstName", fn);
    data.append("lastName", ln);

    startTransition(() => {
      action(data);
    });
  };

  return (
    <ProfileLayout user={user}>
      <div className="max-w-xl w-full p-4 mx-auto">
        <PageModal footer={false}>
          <div className="text-lg mx-4 mb-2 flex items-center">
            <Link href={`/profile?uid=${user.id}`} aria-label={t("back")}>
              <ArrowLeftIcon className="size-6 inline-block me-2" />
            </Link>
            <h1>
              {t.rich("header", {
                noo: () => <Noo />,
              })}
            </h1>
          </div>
          <section>
            <PageModal.Modal className="!block">
              <h1 className="text-2xl mb-4">{t("name.title")}</h1>

              <p className="mb-4 text-sm">
                {t.rich("name.description", {
                  noo: () => <Noo />,
                })}
              </p>

              <form action={action} onSubmit={onSubmit} className="space-y-8">
                <TextField
                  label={t("name.firstName")}
                  name="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                  }}
                  onBlur={(e) => {
                    setFirstName(capitalizeName(e.target.value));
                  }}
                  error={
                    state.error?.firstName &&
                    t(`name.errors.${state.error.firstName}`)
                  }
                  autoFocus
                />
                <TextField
                  label={t("name.lastName")}
                  name="lastName"
                  value={lastName || ""}
                  onChange={(e) => {
                    setLastName(e.target.value);
                  }}
                  onBlur={(e) => {
                    setLastName(capitalizeName(e.target.value));
                  }}
                  error={
                    state.error?.lastName &&
                    t(`name.errors.${state.error.lastName}`)
                  }
                />

                <p className="text-sm">
                  {t.rich("name.updateNotice", {
                    noo: () => <Noo />,
                  })}
                </p>

                <div className="flex gap-4 justify-end items-center">
                  <Link className="link p-2.5" href={`/?uid=${user.id}`}>
                    {commonT("cancel")}
                  </Link>
                  <Button type="submit" pending={isPending}>
                    {commonT("save")}
                  </Button>
                </div>
              </form>
            </PageModal.Modal>
          </section>
        </PageModal>
      </div>
    </ProfileLayout>
  );
}
