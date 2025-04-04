import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Button, type ButtonProps } from "@noo/ui";
import { Fragment } from "react";
import { useTranslations } from "use-intl";

export type ConfirmationDialogProps = {
  message?: string;
  positiveButton?: React.ReactNode;
  negativeButton?: React.ReactNode;
  positiveKind?: ButtonProps["kind"];
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationDialog({
  message = "Are you sure?",
  positiveButton,
  negativeButton,
  positiveKind = "primary",
  onConfirm,
  onCancel,
}: Readonly<ConfirmationDialogProps>) {
  const t = useTranslations("common");

  negativeButton = negativeButton || t("cancel");
  positiveButton = positiveButton || t("confirm");

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <DialogBackdrop className="fixed inset-0 bg-black/60" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="bg-white dark:bg-black dark:shadow-with-highlights px-8 py-6 rounded-xl shadow-xl max-w-sm w-full dark:border dark:border-white/25">
              <DialogTitle className="font-medium mb-8">{message}</DialogTitle>
              <div className="flex justify-end space-x-2">
                <Button onClick={onCancel} kind="plain" size="sm">
                  {negativeButton}
                </Button>
                <Button kind={positiveKind} onClick={onConfirm} size="sm">
                  {positiveButton}
                </Button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
