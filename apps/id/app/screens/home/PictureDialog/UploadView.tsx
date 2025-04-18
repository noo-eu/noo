import { DialogTitle } from "@headlessui/react";
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import AvatarEditor from "react-avatar-editor";
import Dropzone from "react-dropzone";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { type View } from ".";

export function UploadView({
  navigate,
  initialImage,
}: Readonly<{
  navigate: (view: View) => void;
  initialImage: File | null;
}>) {
  const t = useTranslations("profile.picture_dialog");
  const commonT = useTranslations("common");

  const [image, setImage] = useState(initialImage);
  const editorRef = useRef<AvatarEditor>(null);

  const [pending, setPending] = useState(false);
  const user = useAuth();

  const { mutate } = useMutation({
    mutationFn: () => {
      if (editorRef.current && image) {
        const canvas = editorRef.current?.getImage();
        if (!canvas) return Promise.reject(new Error("no image in canvas"));

        const mime = image.type ?? "image/jpeg";

        return new Promise((resolve, reject) => {
          canvas.toBlob(async (blob: Blob | null) => {
            if (!blob) return reject(new Error("no blob"));

            const file = new File([blob], "image", {
              type: mime,
            });

            const formData = new FormData();
            formData.append("image", file);
            fetch(`/profile/picture?uid=${encodeURIComponent(user.id)}`, {
              method: "POST",
              body: formData,
            })
              .then(async (response) => {
                const data = await response.json();
                if (data.error) {
                  reject(new Error(data.error));
                }
                resolve(data);
              })
              .catch((e) => {
                reject(new Error(e));
              });
          }, mime);
        });
      }

      return Promise.reject(new Error("no image"));
    },
    onMutate: () => {
      setPending(true);
    },
    onError: (e: Error | string) => {
      if (typeof e === "string") {
        toast.error(t(`upload.error.${e}`));
      } else {
        toast.error(t("error"));
      }
      setPending(false);
    },
    onSuccess: () => {
      toast.success(t("upload.success"));

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
  });

  return (
    <>
      <DialogTitle className="text-2xl text-center">
        {t("upload.title")}
      </DialogTitle>

      <div className="my-12 flex flex-col items-center justify-center">
        <Dropzone
          onDrop={(dropped) => setImage(dropped[0])}
          noClick
          noKeyboard
          multiple={false}
          maxSize={5 * 1024 * 1024}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              {image && (
                <AvatarEditor
                  ref={editorRef}
                  image={image}
                  width={256}
                  height={256}
                  border={0}
                  className="rounded-3xl border border-white/20 mb-4"
                />
              )}
              {!image && (
                <div className="w-3xs aspect-square border border-black/30 dark:border-white/50 mx-auto rounded-3xl flex items-center justify-center relative">
                  <span className="font-medium text-lg">
                    {t("upload.drag")}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    className="absolute opacity-0 top-0 left-0 w-full h-full cursor-pointer"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                    tabIndex={-1}
                  />
                </div>
              )}
              <input {...getInputProps()} />
            </div>
          )}
        </Dropzone>
      </div>

      {!image && (
        <>
          <div className="relative mb-4">
            <Button
              className="flex items-center gap-2  w-full text-center justify-center"
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  // open file dialog
                  const input = document.querySelector("input[type=file]");
                  input?.dispatchEvent(new MouseEvent("click"));
                }
              }}
            >
              <ArrowUpTrayIcon className="size-5" />
              {t("upload.browse")}
            </Button>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="absolute opacity-0 top-0 left-0 w-full h-full cursor-pointer"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              tabIndex={-1}
            />
          </div>

          <div>
            <Button
              onClick={() => navigate("camera")}
              kind="secondary"
              className="flex items-center gap-2 w-full text-center justify-center"
            >
              <CameraIcon className="size-5" />
              {t("upload.camera")}
            </Button>
          </div>
        </>
      )}

      {image && (
        <div className="gap-4 flex flex-col">
          <Button onClick={() => mutate()} pending={pending}>
            <CheckBadgeIcon className="size-5" />
            {commonT("save")}
          </Button>
          <Button
            onClick={() => setImage(null)}
            kind="secondary"
            disabled={pending}
          >
            <ArrowLeftIcon className="size-5" />
            {t("upload.change")}
          </Button>
        </div>
      )}
    </>
  );
}
