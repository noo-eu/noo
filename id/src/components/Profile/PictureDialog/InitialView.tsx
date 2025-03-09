import { AuthContext } from "@/components/AuthContext";
import { ProfilePicture } from "@/components/ProfilePicture";
import { Profile } from "@/lib/api/profile";
import { DialogTitle } from "@headlessui/react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useContext, useState } from "react";
import toast from "react-hot-toast";
import { View } from ".";

type ExecuteParams = {
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

function useMutation<T>(fn: () => Promise<Response>) {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async ({ onSuccess, onError }: ExecuteParams) => {
    setPending(true);
    setError(null);
    setData(null);

    try {
      const result = await fn();
      if (result.ok) {
        setError(null);
        setData((await result.json()) as T);
        onSuccess?.();
      } else {
        setError(new Error(result.statusText));
        onError?.(result.statusText ? result.statusText : "An error occurred");
      }
    } catch {
      setPending(false);
      setError(new Error("An error occurred"));
      onError?.("An error occurred");
    } finally {
      setPending(false);
    }
  };

  return { isPending, error, data, execute };
}

export function InitialView({ setView }: { setView: (view: View) => void }) {
  const t = useTranslations("profile.picture_dialog");
  const commonT = useTranslations("common");
  const user = useContext(AuthContext);

  const [isPending, setPending] = useState(false);
  const { execute } = useMutation(() => Profile.Picture.remove(user.id));

  const removePicture = async () => {
    setPending(true);
    execute({
      onSuccess: () => {
        toast.success(t("remove_success"));

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      onError: () => {
        toast.error(t("error"));
        setPending(false);
      },
    });
  };

  return (
    <>
      <DialogTitle className="text-xl font-medium text-center mb-8">
        {t("main.title")}
      </DialogTitle>

      <p>{t("main.description")}</p>

      <div className="my-12">
        <ProfilePicture
          user={user}
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
          <Button onClick={removePicture} kind="secondary" pending={isPending}>
            <TrashIcon className="size-5" />
            {commonT("remove")}
          </Button>
        )}
      </div>
    </>
  );
}
