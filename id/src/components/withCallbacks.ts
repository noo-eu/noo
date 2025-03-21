export type Callbacks<T, H = unknown> = {
  onStart?: () => H;
  onEnd?: (handle: H) => void;
  onSuccess?: (result: T, handle: H) => void;
  onError?: (result: T, handle: H) => void;
};

export const withCallbacks = <Args extends unknown[], T, H = unknown>(
  fn: (...args: Args) => Promise<T>,
  callbacks: Callbacks<T, H>,
): ((...args: Args) => Promise<T>) => {
  return async (...args: Args) => {
    const call = fn(...args);
    const handle = callbacks.onStart?.();

    const result = await call;

    if (result && typeof result === "object" && "error" in result) {
      callbacks.onError?.(result, handle!);
    } else {
      callbacks.onSuccess?.(result, handle!);
    }

    callbacks.onEnd?.(handle!);

    return call;
  };
};
