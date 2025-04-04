import { type ReactNode, useId } from "react";
import { Label } from "./Label";
import { SelectInput } from "./SelectInput";

export type SelectFieldProps = {
  label: ReactNode;
  labelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
  error?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField(props: SelectFieldProps) {
  const inputId = useId();
  const errorId = useId();

  const { error, labelProps, ...rest } = props;

  const label = (
    <Label htmlFor={inputId} {...labelProps}>
      {props.label}
    </Label>
  );
  const input = (
    <SelectInput
      {...rest}
      id={inputId}
      aria-describedby={props.error ? errorId : undefined}
      aria-invalid={!!props.error}
    />
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
