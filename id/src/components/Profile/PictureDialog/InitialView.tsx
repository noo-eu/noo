import { ProfilePicture } from "@/components/ProfilePicture";
import { Profile } from "@/lib/api/profile";
import { DialogTitle } from "@headlessui/react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PictureDialogProps, View } from ".";

export function InitialView({
  session,
  setView,
}: {
  close: () => void;
  session: PictureDialogProps["session"];
  setView: (view: View) => void;
}) {
  const t = useTranslations("profile.picture_dialog");
  const commonT = useTranslations("common");

  const [isPending, setPending] = useState(false);

  const removePicture = async () => {
    setPending(true);
    await Profile.Picture.remove(session.id);
    window.location.reload();
  };

  return (
    <>
      <DialogTitle className="text-xl font-medium text-center mb-8">
        {t("main.title")}
      </DialogTitle>

      <p>{t("main.description")}</p>

      <div className="my-12">
        <ProfilePicture
          user={session.user}
          className="w-3xs mx-auto aspect-square text-7xl"
          width={256}
        />
      </div>

      <div className="flex justify-between">
        <Button onClick={() => setView("upload")} disabled={isPending}>
          <PencilIcon className="size-5" />
          {commonT("change")}
        </Button>
        {session.user.picture && (
          <Button onClick={removePicture} kind="secondary" pending={isPending}>
            <TrashIcon className="size-5" />
            {commonT("remove")}
          </Button>
        )}
      </div>
    </>
  );
}
