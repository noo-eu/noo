type Props = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label(props: Props) {
  const { className = "", ...rest } = props;
  const cls = `block text-base font-medium ${className}`;

  return <label {...rest} className={cls} />;
}
