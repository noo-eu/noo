const kindClasses = {
  primary:
    "shadow-xs bg-blue-600 hover:bg-blue-700 text-white focus-visible:outline-blue-700",
  warning:
    "shadow-xs bg-yellow-600 hover:bg-yellow-700 text-white focus-visible:outline-yellow-700",
  secondary:
    "shadow-xs bg-gray-300 hover:bg-gray-400 text-gray-800 focus-visible:outline-gray-400",
  plain:
    "hover:bg-black/5 dark:hover:bg-white/20 rounded-md border border-black/25 dark:border-white/25",
};

const kindClassesOutline = {
  primary:
    "shadow-xs bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus-visible:outline-blue-700",
  warning:
    "shadow-xs bg-transparent border-2 border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white focus-visible:outline-yellow-700",
  secondary:
    "shadow-xs bg-transparent border-2 border-gray-300 text-gray-800 hover:bg-gray-300 hover:text-gray-900 focus-visible:outline-gray-400",
  plain:
    "hover:bg-black/5 dark:hover:bg-white/20 rounded-md border border-black/25 dark:border-white/25",
};

const sizeClasses = {
  sm: "text-sm px-4 py-2",
  md: "text-base px-5 py-2.5",
  lg: "text-lg px-8 py-3",
};

export type ButtonProps = {
  pending?: boolean;
  kind?: keyof typeof kindClasses | "unstyled";
  form?: "outline" | "solid";
  size?: keyof typeof sizeClasses;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button(props: ButtonProps) {
  const {
    className = "",
    pending,
    children,
    kind = "primary",
    size = "md",
    form = "solid",
    ...rest
  } = props;

  let cls: string;
  if (kind === "unstyled") {
    cls = className;
  } else {
    const kindClass =
      form === "outline" ? kindClassesOutline[kind] : kindClasses[kind];

    cls = `
      cursor-pointer rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 flex justify-center items-center gap-2 \
      transition-colors duration-150
      ${className} ${kindClass} ${sizeClasses[size]}`;
  }

  rest.disabled = rest.disabled || pending;

  return (
    <button {...rest} className={cls}>
      {pending && (
        <svg
          className="inline-block -ms-1 size-6 animate-spin text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}

      {children}
    </button>
  );
}
