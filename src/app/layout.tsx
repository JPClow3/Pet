import type { Metadata, Viewport } from "next";
import { Manrope, Fraunces } from "next/font/google";
import Script from "next/script";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Toaster } from "sonner";

import { OfflineBanner } from "@/components/offline-banner";
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

const APP_NAME = "PetHub";
const APP_TITLE = "PetHub — a vida do seu pet em um só lugar";
const APP_DESCRIPTION =
  "Identidade digital, carteira de saúde, diário, lembretes e descoberta local para o seu pet.";
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
  applicationName: APP_NAME,
  title: { default: APP_TITLE, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#fff9ef",
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
        <SerwistProvider swUrl="/serwist/sw.js">
          <ThemeProvider>
            <StoreProvider>
              <OfflineBanner />
              {children}
              <Toaster position="top-center" closeButton richColors />
            </StoreProvider>
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
