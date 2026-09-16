import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PetHub — a vida do seu pet em um só lugar",
    short_name: "PetHub",
    description:
      "Identidade digital, carteira de saúde, diário, lembretes e descoberta local para o seu pet.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#fff9ef",
    theme_color: "#fff9ef",
    categories: ["lifestyle", "health", "pets"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
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
