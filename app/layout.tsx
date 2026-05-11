import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find My Towed Car",
  description: "Live map of every car being towed in San Francisco",
  metadataBase: new URL("https://www.rodinrooh.com"),
  openGraph: {
    title: "Find My Towed Car",
    description: "Live map of every car being towed in San Francisco",
    url: "https://www.rodinrooh.com",
    siteName: "Find My Towed Car",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find My Towed Car",
    description: "Live map of every car being towed in San Francisco",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className="h-full overflow-hidden"
        style={{
          fontFamily:
            '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", sans-serif',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
