import { DialogTitle } from "@headlessui/react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { ProfilePicture } from "~/components/ProfilePicture";
import { Profile } from "~/lib.server/api/profile";
import { type View } from ".";

export function InitialView({
  setView,
}: Readonly<{ setView: (view: View) => void }>) {
  const t = useTranslations("profile.picture_dialog");
  const commonT = useTranslations("common");
  const user = useAuth();

  const [pending, setPending] = useState(false);
  const { mutate } = useMutation({
    mutationFn: () => Profile.Picture.remove(user.id),
    onMutate: () => {
      setPending(true);
    },
    onError: () => {
      toast.error(t("error"));
      setPending(false);
    },
    onSuccess: () => {
      toast.success(t("remove_success"));

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
  });

  return (
    <>
      <DialogTitle className="text-xl font-medium text-center mb-8">
        {t("main.title")}
      </DialogTitle>

      <p>{t("main.description")}</p>

      <div className="my-12">
        <ProfilePicture
          className="w-3xs mx-auto aspect-square text-7xl"
          width={256}
        />
      </div>

      <div className="flex justify-between">
        <Button onClick={() => setView("upload")} disabled={pending}>
          <PencilIcon className="size-5" />
          {commonT("change")}
        </Button>
        {user.picture && (
          <Button onClick={() => mutate()} kind="secondary" pending={pending}>
            <TrashIcon className="size-5" />
            {commonT("remove")}
          </Button>
        )}
      </div>
    </>
  );
}
