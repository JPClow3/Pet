import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modo Cuidador · Cuidados do Pet",
  description:
    "Acesso temporário e simplificado com rotina alimentar, remédios e emergência do pet.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function SitterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-canvas text-ink">{children}</div>;
}
