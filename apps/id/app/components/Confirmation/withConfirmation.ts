import { type ButtonProps } from "@noo/ui";
import { useConfirmation } from "./Context";

export function useWithConfirmation<
  EventType extends { preventDefault: () => void },
>() {
  const confirm = useConfirmation();

  return function withConfirmation(
    fn: (e: EventType, ...args: unknown[]) => void | Promise<void>,
    options?: {
      message?: string;
      positiveKind?: ButtonProps["kind"];
      positiveButton?: React.ReactNode;
      negativeButton?: React.ReactNode;
    },
  ) {
    return async (e: EventType, ...args: unknown[]) => {
      e.preventDefault();

      const result = await confirm(options);
      if (result) {
        return fn(e, ...args);
      }
    };
  };
}
