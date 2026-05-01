import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hyde Park Wood Ltd — Trade portal",
  description: "Hyde Park Wood Ltd wholesale blinds ordering, invoices, and order tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${playfair.variable} min-h-screen font-sans text-foreground antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
