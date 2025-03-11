import { ModalFooter } from "@/components/ModalFooter";

export function PageModal({
  children,
  className = "",
  footer = true,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: boolean;
}) {
  return (
    <div className="sm:flex flex-col justify-center mt-8 sm:mt-auto">
      <div
        className={`sm:my-16 flex flex-col justify-between sm:block sm:min-h-auto sm:max-w-4xl sm:mx-auto lg:w-full ${className}`}
      >
        {children}

        {footer && <ModalFooter />}
      </div>
    </div>
  );
}

PageModal.Modal = function Modal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`${className} dark:border dark:border-white/25 px-8 sm:p-12 w-full sm:rounded-lg sm:shadow-lg sm:backdrop-blur-xs sm:bg-white/40 dark:sm:bg-black/40 lg:grid lg:grid-cols-2 gap-8 dark:sm:shadow-with-highlights`}
    >
      {children}
    </section>
  );
};
