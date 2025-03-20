import { ProfilePicture } from "@/components/ProfilePicture";
import { Profile } from "@/lib/api/profile";
import { DialogTitle } from "@headlessui/react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "react-toastify/unstyled";
import { View } from ".";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/auth/authContext";

export function InitialView({ setView }: { setView: (view: View) => void }) {
  const t = useTranslations("profile.picture_dialog");
  const commonT = useTranslations("common");
  const user = useAuth();

  const [isPending, setPending] = useState(false);
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
        <Button onClick={() => setView("upload")} disabled={isPending}>
          <PencilIcon className="size-5" />
          {commonT("change")}
        </Button>
        {user.picture && (
          <Button onClick={() => mutate()} kind="secondary" pending={isPending}>
            <TrashIcon className="size-5" />
            {commonT("remove")}
          </Button>
        )}
      </div>
    </>
  );
}
