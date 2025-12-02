import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales & Commission Analytics Dashboard",
  description: "Multi-tenant sales performance and commission analytics."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
