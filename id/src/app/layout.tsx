import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "noo id",
  description: "Sign in to your noo account",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
