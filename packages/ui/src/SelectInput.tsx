import { ChevronDownIcon } from "@heroicons/react/24/solid";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export function SelectInput(props: Props) {
  const { className, ...rest } = props;
  const cls = `${className || ""}
    block w-full rounded-md px-3 py-2.5 pe-10 appearance-none
    text-lg
    bg-white text-gray-900 dark:bg-black dark:text-white
    outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-700
    dark:focus:outline-blue-600
    placeholder:text-gray-400`;

  return (
    <div className="relative">
      <select {...rest} className={cls} />
      <ChevronDownIcon
        className="size-4 absolute top-1/2 end-3 -mt-2 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
