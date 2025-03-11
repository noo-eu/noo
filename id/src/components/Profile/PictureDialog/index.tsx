import { AuthContext } from "@/components/AuthContext";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useState } from "react";
import { CameraView } from "./CameraView";
import { CloseDialog } from "./CloseDialog";
import { InitialView } from "./InitialView";
import { UploadView } from "./UploadView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export type PictureDialogProps = {
  isOpen: boolean;
  close: () => void;
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    picture: string | null;
  };
};

export type View = "initial" | "upload" | "crop" | "camera";

const queryClient = new QueryClient();

export default function PictureDialog({
  isOpen,
  close,
  user,
}: PictureDialogProps) {
  const [view, setView] = useState<View>("initial");
  const [capturedImage, setCapturedImage] = useState<File | null>(null);

  const onClose = () => {
    setView("initial");
    setCapturedImage(null);
    close();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={user}>
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          <DialogBackdrop className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 flex w-screen items-center justify-center">
            <DialogPanel className="relative max-sm:min-h-full max-sm:min-w-full max-w-md w-full sm:border border-black/40 dark:border-white/30 bg-white dark:bg-zinc-800 p-8 pt-2 dark:shadow-with-highlights backdrop-blur-sm sm:rounded-lg dark:text-white text-shadow-lg">
              <CloseDialog onClick={onClose} />
              {view === "initial" && <InitialView setView={setView} />}
              {view === "upload" && (
                <UploadView navigate={setView} initialImage={capturedImage} />
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
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
