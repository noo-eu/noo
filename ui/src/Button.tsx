type Props = {
  pending?: boolean;
  kind?: "primary" | "secondary";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const kindClasses = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white focus-visible:outline-blue-700",
  secondary:
    "bg-gray-300 hover:bg-gray-400 text-gray-800 focus-visible:outline-gray-400",
};

export function Button(props: Props) {
  const {
    className = "",
    pending,
    children,
    kind = "primary",
    ...rest
  } = props;
  const cls = `
    cursor-pointer rounded-md px-6 py-2.5 font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 flex justify-center items-center gap-2 \
    transition-colors duration-150
    ${className} ${kindClasses[kind]}
  `;

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
