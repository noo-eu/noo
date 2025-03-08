import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowUpTrayIcon,
  CameraIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useRef, useState, useTransition } from "react";
import AvatarEditor from "react-avatar-editor";
import Dropzone from "react-dropzone";
import { ProfilePicture } from "../ProfilePicture";

type PictureDialogProps = {
  isOpen: boolean;
  close: () => void;
  session: {
    id: string;
    user: {
      firstName: string;
      picture: string | null;
    };
  };
};

type Page = "initial" | "upload" | "crop" | "camera";

export function PictureDialog({ isOpen, close, session }: PictureDialogProps) {
  const [page, setPage] = useState<Page>("initial");

  const onClose = () => {
    setPage("initial");
    close();
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-md w-full space-y-4 border border-white/30 bg-white/20 p-8 dark:shadow-with-highlights sm:backdrop-blur-sm rounded-lg text-white text-shadow-lg">
            {page === "initial" && (
              <InitialPage close={close} session={session} setPage={setPage} />
            )}
            {page === "upload" && (
              <UploadPage setPage={setPage} session={session} />
            )}
            {page === "crop" && <div>Crop</div>}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function InitialPage({
  close,
  session,
  setPage,
}: {
  close: () => void;
  session: PictureDialogProps["session"];
  setPage: (page: Page) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const removePicture = async () => {
    startTransition(async () => {
      await fetch(`/private-api/picture?sid=${session.id}`, {
        method: "DELETE",
      });

      window.location.reload();
    });
  };

  return (
    <>
      <DialogTitle className="text-2xl">Profile picture</DialogTitle>

      <p>
        A picture helps you and others recognize your account. You can change or
        remove it at any time.
      </p>

      <div className="m-12">
        <ProfilePicture
          user={session.user}
          className="w-full aspect-square text-7xl"
          width={286}
        />
      </div>

      <div className="flex justify-between">
        <Button
          onClick={() => setPage("upload")}
          className="flex items-center gap-2"
        >
          <PencilIcon className="size-5" />
          Change
        </Button>
        <Button
          onClick={removePicture}
          kind="secondary"
          className="flex items-center gap-2"
          pending={isPending}
        >
          <TrashIcon className="size-5" />
          Remove
        </Button>
      </div>
    </>
  );
}

function UploadPage({
  setPage,
  session,
}: {
  setPage: (page: Page) => void;
  session: PictureDialogProps["session"];
}) {
  type ActionState = { error: string | undefined; ok: boolean | undefined };

  const [image, setImage] = useState<File | null>(null);
  const editorRef = useRef<AvatarEditor>(null);

  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const handleUpload = async () => {
    if (editorRef.current) {
      startTransition(() => {
        const canvas = editorRef.current?.getImage();
        if (!canvas) return;

        const mime = image?.type || "image/jpeg";

        // Convert canvas to Blob
        canvas.toBlob(async (blob) => {
          const file = new File([blob!], "image", {
            type: mime,
          });

          // Upload the file
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(
            `/private-api/picture?sid=${session.id}`,
            {
              method: "POST",
              body: formData,
            },
          );

          if (response.ok) {
            window.location.reload();
          } else {
            const data = await response.json();
            setError(data.error);
          }
        }, mime);
      });
    }
  };

  return (
    <>
      <DialogTitle className="text-2xl text-center">
        Change profile picture
      </DialogTitle>

      {error && <p className="text-red-500 text-center">{error}</p>}

      <div className="my-12 mx-12 flex justify-center">
        <Dropzone
          onDrop={(dropped) => setImage(dropped[0])}
          noClick
          noKeyboard
          // style={{ width: "250px", height: "250px" }}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              {image && (
                <AvatarEditor
                  ref={editorRef}
                  image={image}
                  width={190}
                  height={190}
                  border={0}
                  className="rounded-3xl border border-white/20"
                />
              )}
              {!image && (
                <div className="w-48 h-48 border mx-auto rounded-full flex items-center justify-center relative">
                  <span>Drag photo here</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    className="absolute opacity-0 top-0 left-0 w-full h-full cursor-pointer"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
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
          <div className="relative">
            <Button className="flex items-center gap-2  w-full text-center justify-center">
              <ArrowUpTrayIcon className="size-5" />
              Choose from your computer
            </Button>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="absolute opacity-0 top-0 left-0 w-full h-full cursor-pointer"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <Button
              onClick={() => setPage("camera")}
              kind="secondary"
              className="flex items-center gap-2 w-full text-center justify-center"
            >
              <CameraIcon className="size-5" />
              Take a picture
            </Button>
          </div>
        </>
      )}

      {image && (
        <div className="flex justify-between">
          <Button
            onClick={() => setImage(null)}
            kind="secondary"
            className="w-1/2"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} className="w-1/2" pending={isPending}>
            Save
          </Button>
        </div>
      )}
    </>
  );
}
