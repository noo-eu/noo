import { useCallback, useState } from "react";

import PictureDialog from "~/screens/home/PictureDialog";

export function useProfilePictureDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const Dialog = () => <PictureDialog isOpen={isOpen} close={close} />;

  return { isOpen, open, close, Dialog };
}
