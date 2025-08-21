export type Trail = ReadonlyArray<{
  layer: string;
  code: string;
  meta?: Record<string, unknown>;
}>;

export type ErrorEnvelope<Code extends string> = {
  code: Code;
  message?: string;
  cause?: unknown;
  retryable?: boolean;
  trail?: Trail;
};

type AnyErr<C extends string = string> = Partial<ErrorEnvelope<C>> | unknown;

export function liftError<From extends string, To extends string>(
  layer: string,
  map: (e: AnyErr<From>) => ErrorEnvelope<To>,
  hopMeta?: Record<string, unknown>,
) {
  return (e: AnyErr<From>): ErrorEnvelope<To> => {
    const mapped = map(e);

    const prev = e as Partial<ErrorEnvelope<From>>;
    const deepest =
      prev && "cause" in prev && prev.cause !== undefined ? prev.cause : e;

    const prevTrail = Array.isArray(prev?.trail) ? prev!.trail! : [];
    const trail = [...prevTrail, { layer, code: mapped.code, meta: hopMeta }];
    const retryable = prev?.retryable;

    return { ...mapped, cause: deepest, trail, retryable };
  };
}
