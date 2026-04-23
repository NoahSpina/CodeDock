import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CodeDock",
  description: "Real-time technical interview platform",
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