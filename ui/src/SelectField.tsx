import { ReactNode, useId } from "react";
import { Label } from "./Label";
import { SelectInput } from "./SelectInput";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

export type SelectFieldProps = {
  label: ReactNode;
  error?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField(props: SelectFieldProps) {
  const inputId = useId();
  const errorId = useId();

  const { error, ...rest } = props;

  const label = <Label htmlFor={inputId}>{props.label}</Label>;
  const input = (
    <div className="relative">
      <SelectInput
        {...rest}
        id={inputId}
        aria-describedby={props.error ? errorId : undefined}
        aria-invalid={!!props.error}
        className={`${rest.className} w-full pr-12`}
      />
      <ChevronDownIcon
        className="size-4 absolute top-1/2 right-3 -mt-2 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );

  return (
    <div className="space-y-1">
      {label}
      {input}
      {error && (
        <p id={errorId} className="text-red-500 text-sm/6">
          {props.error}
        </p>
      )}
    </div>
  );
}
