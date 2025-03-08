type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export function SelectInput(props: Props) {
  const { className = "", ...rest } = props;
  const cls = `${className}
    block w-full rounded-md px-3 py-2.5 appearance-none
    text-lg
    bg-white text-gray-900 dark:bg-black dark:text-white
    outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-700
    dark:focus:outline-blue-600
    placeholder:text-gray-400`;

  return <select {...rest} className={cls} />;
}
