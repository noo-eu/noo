import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useState } from "react";
import { CameraView } from "./CameraView";
import { CloseDialog } from "./CloseDialog";
import { InitialView } from "./InitialView";
import { UploadView } from "./UploadView";

export type PictureDialogProps = {
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

export type View = "initial" | "upload" | "crop" | "camera";

export function PictureDialog({ isOpen, close, session }: PictureDialogProps) {
  const [view, setView] = useState<View>("initial");
  const [capturedImage, setCapturedImage] = useState<File | null>(null);

  const onClose = () => {
    setView("initial");
    setCapturedImage(null);
    close();
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center">
          <DialogPanel className="relative max-sm:min-h-full max-sm:min-w-full max-w-md w-full sm:border border-white/30 bg-zinc-800 p-8 pt-2 dark:shadow-with-highlights backdrop-blur-sm sm:rounded-lg text-white text-shadow-lg">
            <CloseDialog onClick={onClose} />
            {view === "initial" && (
              <InitialView close={close} session={session} setView={setView} />
            )}
            {view === "upload" && (
              <UploadView
                navigate={setView}
                session={session}
                initialImage={capturedImage}
              />
            )}
            {view === "camera" && (
              <CameraView
                navigate={setView}
                onCapture={(f: File) => {
                  setCapturedImage(f);
                  setView("upload");
                }}
              />
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
