import { Footer } from "@/components/Footer";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ToastContainer } from "react-toastify/unstyled";
import "./globals.css";

export const metadata: Metadata = {
  title: "noo id",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <NextIntlClientProvider messages={messages}>
        <body className="min-h-screen bg-stone-50 text-neutral-950 dark:bg-black dark:text-white flex flex-col">
          {children}
          <Footer />
          <ToastContainer position="bottom-center" />
        </body>
      </NextIntlClientProvider>
    </html>
  );
}
