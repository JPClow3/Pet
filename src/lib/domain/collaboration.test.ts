import { describe, expect, it } from "vitest";
import {
  createSitterPassToken,
  hashSitterPassToken,
  hashSitterPin,
  sanitizeForSitterView,
  SITTER_PASS_TOKEN,
  verifySitterPin,
} from "./collaboration";
import type { HealthRecord, Pet } from "./schema";

const mockPet: Pet = {
  id: "pet-1",
  name: "Pipoca",
  species: "cao",
  breed: "SRD",
  sex: "femea",
  birthDate: "2021-05-10",
  weightKg: 12.5,
  photo: "data:image/png;base64,sample",
  color: "Caramelo",
  microchip: "982000412345678", // Sensitive!
  notes: "Muito dócil, mas se assusta com rojões",
  routine: ["Passeio matinal", "Ração"],
  card: {
    shareBreed: true,
    shareCity: true,
    shareHealth: true,
    contact: "11987654321",
  },
  lostMode: {
    active: false,
    since: null,
    note: null,
  },
  createdAt: "2024-01-01T12:00:00.000Z",
  updatedAt: "2024-01-01T12:00:00.000Z",
};

const mockRecords: HealthRecord[] = [
  {
    id: "rec-1",
    petId: "pet-1",
    type: "medicamento",
    title: "Antibiótico Cefalexina",
    date: "2026-10-20",
    nextDueDate: null,
    leadDays: 0,
    recurrenceMonths: null,
    professional: "Dr. Silva",
    notes: "Tomar após a comida",
    attachmentName: "laudo_sigiloso.pdf", // Sensitive!
    attachmentData: "base64_private_content", // Sensitive!
    weightKg: null,
    completedAt: null,
    createdAt: "2026-10-20T10:00:00.000Z",
    medication: {
      activeScheduleId: "sched-1",
      schedules: [
        {
          id: "sched-1",
          amount: "1",
          unit: "comprimido",
          times: ["08:00", "20:00"],
          everyDays: 1,
          startsOn: "2026-10-20",
          endsOn: "2026-10-30",
          timeZone: "America/Sao_Paulo",
          instructions: "Dar enrolado no petisco",
          source: "Receita médica",
          effectiveFrom: null,
          closedAt: null,
          createdAt: "2026-10-20T10:00:00.000Z",
        },
      ],
      events: [],
    },
  },
  {
    id: "rec-surgery",
    petId: "pet-1",
    type: "consulta",
    title: "Biópsia e Cirurgia",
    date: "2025-03-12",
    nextDueDate: null,
    leadDays: 0,
    recurrenceMonths: null,
    professional: "Dra. Paula",
    notes: "Cirurgia delicada com detalhes confidenciais",
    attachmentName: "prontuario_cirurgico.pdf",
    attachmentData: "dados_confidenciais",
    weightKg: null,
    completedAt: "2025-03-12T15:00:00.000Z",
    createdAt: "2025-03-12T15:00:00.000Z",
  },
];

describe("Domínio de Colaboração e Modo Cuidador", () => {
  it("gera e valida tokens criptográficos de cuidador", async () => {
    const token = createSitterPassToken();
    expect(token).toMatch(SITTER_PASS_TOKEN);
    expect(token.startsWith("s_")).toBe(true);

    const hash = await hashSitterPassToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("protege e verifica PIN de 4 a 6 dígitos", async () => {
    const pin = "4829";
    const hash = await hashSitterPin(pin);
    expect(hash).toMatch(/^pbkdf2-sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$/);
    expect(await hashSitterPin(pin)).not.toBe(hash);

    const valid = await verifySitterPin(pin, hash);
    expect(valid).toBe(true);

    const invalid = await verifySitterPin("1234", hash);
    expect(invalid).toBe(false);

    // Rejeita PINs que não tenham 4 a 6 dígitos numéricos
    await expect(hashSitterPin("12")).rejects.toThrow();
    await expect(hashSitterPin("1234567")).rejects.toThrow();
    await expect(hashSitterPin("abcd")).rejects.toThrow();
  });

  it("mantém a verificação dos PINs legados", async () => {
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("zelupi_sitter_pin:4829"),
    );
    const legacy = Array.from(new Uint8Array(bytes), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    expect(await verifySitterPin("4829", legacy)).toBe(true);
    expect(await verifySitterPin("1234", legacy)).toBe(false);
    expect(await verifySitterPin("4829", "corrupted")).toBe(false);
  });

  it.each([undefined, null, "", "   "])(
    "não compartilha notas privadas quando a instrução é %s",
    (specialCareNotes) => {
      const data = sanitizeForSitterView({
        pet: mockPet,
        records: [],
        specialCareNotes,
        emergencyContact: {
          tutorName: "Tutor",
          tutorPhone: "11999999999",
          emergencyVetName: "Vet",
          emergencyVetPhone: "11988888888",
          is24h: true,
        },
      });
      expect(data.specialCareNotes).toBeNull();
      expect(JSON.stringify(data)).not.toContain(mockPet.notes);
    },
  );

  it("garante privacidade estrita na sanitização para o Modo Cuidador", () => {
    const sitterData = sanitizeForSitterView({
      pet: mockPet,
      records: mockRecords,
      allergies: ["Frango", "Picada de abelha"],
      specialCareNotes: "Passear somente com guia peitoral",
      emergencyContact: {
        tutorName: "Renata",
        tutorPhone: "11988887777",
        emergencyVetName: "Hospital Vet 24h",
        emergencyVetPhone: "1133334444",
        emergencyClinicName: "Clínica São Francisco",
        emergencyAddress: "Rua das Flores, 123",
        is24h: true,
      },
      feedingSchedule: [
        {
          id: "feed-1",
          time: "08:00",
          description: "Ração Seca Premier",
          amount: "120g",
        },
      ],
    });

    // Dados visíveis ao cuidador
    expect(sitterData.pet.name).toBe("Pipoca");
    expect(sitterData.allergies).toEqual(["Frango", "Picada de abelha"]);
    expect(sitterData.emergencyContact.emergencyVetPhone).toBe("1133334444");
    expect(sitterData.feedingSchedule).toHaveLength(1);
    expect(sitterData.medicationSchedule).toHaveLength(1);
    expect(sitterData.medicationSchedule[0].name).toBe(
      "Antibiótico Cefalexina",
    );

    // GARANTIA DE PRIVACIDADE: Dados confidenciais NUNCA são vazados
    const serialized = JSON.stringify(sitterData);
    expect(serialized).not.toContain("982000412345678"); // microchip NUNCA exposto
    expect(serialized).not.toContain("laudo_sigiloso.pdf"); // anexos NUNCA expostos
    expect(serialized).not.toContain("base64_private_content");
    expect(serialized).not.toContain("Biópsia e Cirurgia"); // histórico cirúrgico antigo NUNCA exposto
    expect(serialized).not.toContain("prontuario_cirurgico.pdf");
  });
});
