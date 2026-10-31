import type { Metadata } from "next";

import { AppGate } from "@/components/app-gate";
import { brand } from "@/lib/brand";

// Each route layout sets its own title; the template is restated here because
// templates only reach direct children ("Agenda · Zelupi").
export const metadata: Metadata = {
  title: { default: "Hoje", template: `%s · ${brand.name}` },
};

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppGate>{children}</AppGate>;
}
