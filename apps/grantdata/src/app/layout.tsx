import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrantData",
  description: "Community Needs Data for Grant Applications",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
