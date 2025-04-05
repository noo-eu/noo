import { useEffect } from "react";
import type { Fetcher } from "react-router";

export type Callbacks<T, H = unknown> = {
  onStart?: () => H;
  onEnd?: (handle: H) => void;
  onSuccess?: (result: T, handle: H) => void;
  onError?: (result: T, handle: H) => void;
};

export const useCallbacks = <T, H = unknown>(
  fetcher: Fetcher<any>,
  callbacks: Callbacks<T, H>,
) => {
  let handle: H | undefined;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const result = fetcher.data as T;
      if (result && typeof result === "object" && "error" in result) {
        callbacks.onError?.(result, handle!);
      } else {
        callbacks.onSuccess?.(result, handle!);
      }
      callbacks.onEnd?.(handle!);
    } else if (fetcher.state === "submitting") {
      handle = callbacks.onStart?.();
    }
  }, [fetcher.state, fetcher.data]);
};
