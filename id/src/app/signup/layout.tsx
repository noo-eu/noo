import { ModalFooter } from "@/components/ModalFooter";
import { Noo } from "@/components/Noo";
import { useTranslations } from "next-intl";

export default function SignupPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = useTranslations();

  return (
    <div className="sm:flex flex-col justify-center min-h-screen dark:bg-black/40 dark:sm:bg-transparent">
      <div className="sm:my-16 flex flex-col justify-between min-h-screen sm:block sm:min-h-auto">
        <div className="px-8 sm:p-12 w-full sm:max-w-lg sm:mx-auto sm:rounded-lg sm:shadow-lg sm:backdrop-blur-xs sm:bg-white/40 dark:sm:bg-black/40">
          <h1 className="text-4xl text-center mb-8">
            {t.rich("signup.create_your_account", { noo: () => <Noo /> })}
          </h1>

          {children}
        </div>

        <div className="sm:max-w-lg sm:mx-auto">
          <ModalFooter />
        </div>
      </div>
    </div>
  );
}
