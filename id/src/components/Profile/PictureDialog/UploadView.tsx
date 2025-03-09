import { AuthContext } from "@/components/AuthContext";
import { Profile } from "@/lib/api/profile";
import { DialogTitle } from "@headlessui/react";
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useContext, useRef, useState } from "react";
import AvatarEditor from "react-avatar-editor";
import Dropzone from "react-dropzone";
import { View } from ".";

export function UploadView({
  navigate,
  initialImage,
}: {
  navigate: (view: View) => void;
  initialImage: File | null;
}) {
  const t = useTranslations("profile.picture_dialog");
  const commonT = useTranslations("common");

  const [image, setImage] = useState(initialImage);
  const editorRef = useRef<AvatarEditor>(null);

  const [error, setError] = useState<string | undefined>();
  const [isPending, setPending] = useState(false);
  const user = useContext(AuthContext);

  const handleUpload = async () => {
    if (editorRef.current && image) {
      const canvas = editorRef.current?.getImage();
      if (!canvas) return;

      const mime = image.type || "image/jpeg";

      setPending(true);
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], "image", {
          type: mime,
        });

        try {
          const response = await Profile.Picture.upload(user.id, file);

          if (response.ok) {
            window.location.reload();
          } else {
            const data = await response.json();
            setPending(false);
          }
        } catch (error) {
          setError("An error occurred. Please try again.");
          setPending(false);
        }
      }, mime);
    }
  };

  return (
    <>
      <DialogTitle className="text-2xl text-center">
        {t("upload.title")}
      </DialogTitle>

      {error && <p className="text-red-500 text-center">{error}</p>}

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
                <>
                  <AvatarEditor
                    ref={editorRef}
                    image={image}
                    width={256}
                    height={256}
                    border={0}
                    className="rounded-3xl border border-white/20 mb-4"
                  />
                </>
              )}
              {!image && (
                <div className="w-3xs aspect-square border border-white/50 mx-auto rounded-3xl flex items-center justify-center relative">
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
          <Button onClick={handleUpload} pending={isPending}>
            <CheckBadgeIcon className="size-5" />
            {commonT("save")}
          </Button>
          <Button
            onClick={() => setImage(null)}
            kind="secondary"
            disabled={isPending}
          >
            <ArrowLeftIcon className="size-5" />
            {t("upload.change")}
          </Button>
        </div>
      )}
    </>
  );
}
