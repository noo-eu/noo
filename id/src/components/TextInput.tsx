type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function TextInput(props: Props) {
  const { type = "text", className = "", ...rest } = props;
  const cls = `${className}
    block w-full rounded-md px-3 py-2.5
    text-lg
    bg-white text-gray-900 dark:bg-black dark:text-white
    outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-700
    dark:focus:outline-blue-600
    placeholder:text-gray-400`;

  return <input {...rest} type={type} className={cls} />;
}
