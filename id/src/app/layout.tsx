import { Footer } from "@/components/Footer";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "react-hot-toast";
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
        <head>
          <link rel="preconnect" href="https://rsms.me/" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin=""
          />
          <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&display=swap"
          />
        </head>
        <body className="min-h-screen bg-stone-50 text-neutral-950 dark:bg-black dark:text-white flex flex-col">
          {children}
          <Footer />
          <Toaster position="bottom-center" />
        </body>
      </NextIntlClientProvider>
    </html>
  );
}
