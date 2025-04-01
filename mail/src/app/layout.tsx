import { getCurrentLocale } from "@/i18n/request";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";

export async function generateMetadata() {
  return {
    title: `noo mail`,
    description: "",
    icons: [
      {
        url: "https://static.noo.eu/favicon.ico",
        type: "image/x-icon",
        sizes: "any",
        rel: "icon",
      },
      {
        url: "https://static.noo.eu/favicon.svg",
        type: "image/svg+xml",
        sizes: "any",
        rel: "icon",
      },
      {
        url: "https://static.noo.eu/favicon-96x96.png",
        type: "image/png",
        sizes: "96x96",
        rel: "icon",
      },
      {
        url: "https://static.noo.eu/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
        rel: "apple-touch-icon",
      },
    ],
    openGraph: {
      images: "https://static.noo.eu/noo-cover.png",
    },
    manifest: "https://static.noo.eu/site.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <NextIntlClientProvider messages={messages}>
        <body className="min-h-screen bg-stone-50 text-neutral-950 dark:bg-black dark:text-white flex flex-col">
          {children}
        </body>
      </NextIntlClientProvider>
    </html>
  );
}
