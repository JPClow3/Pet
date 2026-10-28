import type { MetadataRoute } from "next";

import { brand, brandColors } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: brand.title,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    background_color: brandColors.canvas,
    theme_color: brandColors.canvas,
    categories: ["lifestyle", "health", "pets"],
    icons: [
      {
        src: "/icons/zelupi-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/zelupi-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/zelupi-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Adicionar registro",
        short_name: "Registro",
        url: "/record/new",
      },
      {
        name: "Lembretes",
        short_name: "Lembretes",
        url: "/reminders",
      },
    ],
  };
}
