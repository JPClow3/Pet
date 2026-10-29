import { describe, expect, it } from "vitest";
import { generateLostPosterHtml, qrCodeSvg } from "./lost-poster";
import { lostPosterFileName } from "@/lib/lost-poster-export";
import type { Pet } from "./schema";

const samplePet: Pet = {
  id: "pet-rex",
  name: "Rex",
  species: "cao",
  breed: "Pastor Alemão",
  sex: "macho",
  birthDate: "2021-03-15",
  weightKg: 34.0,
  photo: "data:image/png;base64,iVBORw0KGgo...",
  color: "Capa preta",
  microchip: "981098102999888",
  allergies: [],
  chronicConditions: [],
  notes: "Muito dócil, atende pelo nome.",
  routine: [],
  card: {
    shareBreed: true,
    shareCity: true,
    shareHealth: true,
    contact: "11 98888-7777",
  },
  lostMode: {
    active: true,
    since: "2026-05-10",
    note: "Visto pela última vez perto da praça",
    neighborhood: "Jardim das Flores",
    contactPhone: "11 98888-7777",
    reward: "R$ 1.000",
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("lost pet poster generation", () => {
  it("generates vector SVG for QR codes", () => {
    const svg = qrCodeSvg("https://zelupi.app/p/c_test_token_12345");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("viewBox");
  });

  it("generates complete A4 printable HTML with all lost pet details", () => {
    const html = generateLostPosterHtml({
      pet: samplePet,
      photo: samplePet.photo,
      publicUrl: "https://zelupi.app/p/c_test_token_12345",
      neighborhood: "Jardim das Flores",
      city: "São Paulo",
      reward: "R$ 1.000",
      contactPhone: "11 98888-7777",
    });

    expect(html).toContain("PROCURA-SE");
    expect(html).toContain("REX");
    expect(html).toContain("Pastor Alemão");
    expect(html).toContain("Jardim das Flores");
    expect(html).toContain("R$ 1.000");
    expect(html).toContain("11 98888-7777");
    expect(html).toContain("981098102999888");
    expect(html).toContain("https://zelupi.app/p/c_test_token_12345");
    expect(html).toContain("@page");
  });

  it("creates valid sanitized file names for poster exports", () => {
    expect(lostPosterFileName("Rex", "a4")).toBe("cartaz-perdido-rex-a4.png");
    expect(lostPosterFileName("Mel e Thor!", "square")).toBe(
      "cartaz-perdido-mel-e-thor-square.png",
    );
  });
});
