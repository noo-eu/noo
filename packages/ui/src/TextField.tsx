import { type ReactNode, useEffect, useId, useRef } from "react";
import { Label } from "./Label";
import { TextInput } from "./TextInput";

export type TextFieldProps = {
  label: ReactNode;
  suffix?: ReactNode;
  error?: string;
  focusOnLoad?: boolean;

  aroundLabel?: (children: ReactNode) => ReactNode;

  wrapper?: {
    className?: string;
  };
  append?: ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "autoFocus">;

export function TextField(props: TextFieldProps) {
  const inputId = useId();
  const errorId = useId();

  const { aroundLabel, error, suffix, append, focusOnLoad, ...rest } = props;
  const id = rest.id || inputId;

  const label = <Label htmlFor={id}>{props.label}</Label>;
  const wrappedLabel = aroundLabel ? aroundLabel(label) : label;

  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Check if the ref is attached to an element
    if (ref.current && focusOnLoad) {
      setTimeout(() => ref.current?.focus(), 1);
    }
  }, []);

  const input = (
    <TextInput
      {...rest}
      id={id}
      aria-describedby={props.error ? errorId : undefined}
      aria-invalid={!!props.error}
      className={`${rest.className} ${suffix ? "rounded-r-none -me-px" : ""}`}
      ref={ref}
    />
  );

  const field = suffix ? (
    <div className="flex">
      {input}
      {props.suffix && (
        <div className="bg-gray-100 flex shrink-0 items-center rounded-r-md px-4 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6">
          {suffix}
        </div>
      )}
    </div>
  ) : (
    input
  );

  return (
    <div className={`${props.wrapper?.className || ""} space-y-1`}>
      {wrappedLabel}
      {field}
      {error && (
        <p id={errorId} className="text-red-500 text-sm/6">
          {props.error}
        </p>
      )}
      {append}
    </div>
  );
}
