import type { Metadata } from "next";

import { brand } from "@/lib/brand";

// Templates only reach direct children, so each level restates it.
export const metadata: Metadata = {
  title: { default: "Modo cuidador", template: `%s · ${brand.name}` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
