import { useEffect, useRef } from "react";
import type { Fetcher } from "react-router";

export type Callbacks<T, H = unknown> = {
  onStart?: () => H;
  onEnd?: (handle: H) => void;
  onSuccess?: (result: T, handle: H) => void;
  onError?: (result: T, handle: H) => void;
};

export const useCallbacks = <T, H = unknown>(
  fetcher: Fetcher<T>,
  callbacks: Callbacks<T, H>,
) => {
  const handle = useRef<H | undefined>(undefined);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const result = fetcher.data as T;
      if (result && typeof result === "object" && "error" in result) {
        callbacks.onError?.(result, handle.current!);
      } else {
        callbacks.onSuccess?.(result, handle.current!);
      }
      callbacks.onEnd?.(handle.current!);
    } else if (fetcher.state === "submitting") {
      handle.current = callbacks.onStart?.();
    }
  }, [fetcher.state, fetcher.data, callbacks]);
};
