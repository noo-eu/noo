"use client";

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
          {children}
        </div>

        <div className="w-full sm:max-w-lg sm:mx-auto flex justify-end space-x-4 my-4 px-8 sm:px-0">
          <a
            href="/"
            className="text-xs hover:bg-blue-200 dark:hover:bg-white/20 p-2.5 rounded-md"
          >
            {t("common.terms")}
          </a>
          <a
            href="/"
            className="text-xs hover:bg-blue-200 dark:hover:bg-white/20 p-2.5 rounded-md"
          >
            {t("common.privacy")}
          </a>
        </div>
      </div>
    </div>
  );
}
