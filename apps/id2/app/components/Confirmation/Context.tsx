import { createContext, useCallback, useContext, useState } from "react";
import { ConfirmationDialog } from "./Dialog";

type ConfirmationOptions = {
  message?: string;
  positiveButton?: React.ReactNode;
  negativeButton?: React.ReactNode;
};

type ConfirmFunction = (options?: ConfirmationOptions) => Promise<boolean>;

const ConfirmationContext = createContext<ConfirmFunction | undefined>(
  undefined,
);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context)
    throw new Error(
      "useConfirmation must be used within a ConfirmationProvider",
    );
  return context;
};

export const ConfirmationProvider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({});
  const [resolvePromise, setResolvePromise] =
    useState<(value: boolean) => void>();

  const confirm = useCallback((opts: ConfirmationOptions = {}) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    resolvePromise?.(result);
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {isOpen && (
        <ConfirmationDialog
          {...options}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </ConfirmationContext.Provider>
  );
};
