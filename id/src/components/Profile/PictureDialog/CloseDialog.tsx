import { XMarkIcon } from "@heroicons/react/24/solid";

export type CloseDialogProps = {
  onClick: () => void;
};

export function CloseDialog({ onClick }: CloseDialogProps) {
  const shadow =
    " \
    hover:bg-yellow-600 shadow-amber-600/90 hover:shadow-[0_0_15px_2px_var(--tw-shadow-color)] hover:text-white focus:text-white \
    dark:hover:bg-amber-900 dark:shadow-amber-900/90 dark:hover:shadow-[0_0_25px_5px_var(--tw-shadow-color)] \
    focus:shadow-[0_0_20px_5px_var(--tw-shadow-color)] focus:outline-[0_0_0_2px_var(--tw-ring-color)] focus:bg-yellow-600 dark:focus:bg-amber-900 outline-none";

  return (
    <button
      onClick={onClick}
      tabIndex={0}
      className={`absolute px-4 top-0 left-0 sm:rounded-tl-md border-b border-r border-black/40 focus:border-black/10 hover:border-black/10 dark:border-white/30 p-2 cursor-pointer rounded-br-sm ${shadow} transition-all duration-150`}
    >
      <XMarkIcon className="size-6" />
    </button>
  );
}
