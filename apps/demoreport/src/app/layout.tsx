import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

// Replace with real GA4 Measurement ID when ready
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-XXXXXXXXXX";

export const metadata: Metadata = {
  title: {
    template: "%s | DemoReport",
    default: "DemoReport — Demographic Feasibility Reports for Australian Property",
  },
  description:
    "Instant demographic feasibility reports for Australian suburbs. Powered by ABS Census 2021 and SEIFA 2021 data. Built for property developers, planners, and investors.",
  metadataBase: new URL("https://demoreport.com.au"),
  openGraph: {
    siteName: "DemoReport",
    type: "website",
    locale: "en_AU",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
