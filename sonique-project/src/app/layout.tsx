import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "../components/layout/AppLayout";

const geistSans = { variable: "" };
const geistMono = { variable: "" };

export const metadata: Metadata = {
  title: "Sonique Music",
  description: "Modern full-stack music streaming player",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-200">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
