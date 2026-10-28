import type { Metadata, Viewport } from "next";
import { Manrope, Fraunces } from "next/font/google";
import Script from "next/script";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Toaster } from "sonner";

import { brand, brandColors } from "@/lib/brand";
import { OfflineBanner } from "@/components/offline-banner";
import { AppUpdateNotice } from "@/components/app-update-notice";
import { StoreProvider } from "@/components/store-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const THEME_BOOTSTRAP_SCRIPT = `(function () {
  var root = document.documentElement;
  var theme = "light";
  try {
    theme = window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
  } catch (error) {}
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
})();`;

export const metadata: Metadata = {
  metadataBase: process.env.SITE_URL
    ? new URL(process.env.SITE_URL)
    : undefined,
  applicationName: brand.name,
  title: { default: brand.title, template: `%s · ${brand.name}` },
  description: brand.description,
  appleWebApp: { capable: true, statusBarStyle: "default", title: brand.name },
  formatDetection: { telephone: false },
  twitter: {
    card: "summary_large_image",
    title: brand.title,
    description: brand.description,
  },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: brand.title,
    description: brand.description,
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: brandColors.canvas,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <SerwistProvider swUrl="/serwist/sw.js" reloadOnOnline={false}>
          <ThemeProvider>
            <StoreProvider>
              <OfflineBanner />
              <AppUpdateNotice />
              {children}
              <Toaster position="top-center" closeButton richColors />
            </StoreProvider>
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
