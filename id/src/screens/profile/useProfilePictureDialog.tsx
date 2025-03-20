import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const PictureDialog = dynamic(
  () => import("@/components/Profile/PictureDialog"),
  { ssr: false },
);

export function useProfilePictureDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const Dialog = () => <PictureDialog isOpen={isOpen} close={close} />;

  return { isOpen, open, close, Dialog };
}
