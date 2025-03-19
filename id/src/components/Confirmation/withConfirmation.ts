import { ButtonProps } from "@noo/ui";
import { useConfirmation } from "./Context";

export function useWithConfirmation() {
  const confirm = useConfirmation();

  return function withConfirmation(
    fn: (...args: unknown[]) => void | Promise<void>,
    options?: {
      message?: string;
      positiveKind?: ButtonProps["kind"];
      positiveButton?: React.ReactNode;
      negativeButton?: React.ReactNode;
    },
  ) {
    return async (...args: unknown[]) => {
      const result = await confirm(options);
      if (result) {
        return fn(...args);
      }
    };
  };
}
