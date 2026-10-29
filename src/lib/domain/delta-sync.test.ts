import { describe, expect, it } from "vitest";
import { createBackup } from "./backup";
import {
  applyBackupDelta,
  computeBackupDelta,
  mergeBackupsByRecord,
} from "./delta-sync";
import { useAppStore } from "@/lib/store/app-store";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function createBaseBackup() {
  const initial = useAppStore.getInitialState();
  return createBackup(
    {
      ...initial,
      tutor: {
        name: "Marina",
        email: "marina@zelupi.test",
        city: "São Paulo",
        focusAreas: ["saude"],
        marketingOptIn: false,
        createdAt: "2026-10-28T10:00:00.000Z",
      },
      pets: [
        {
          id: "pet-1",
          name: "Bento",
          species: "cao",
          breed: "SRD",
          sex: "macho",
          birthDate: "2022-05-10",
          weightKg: 14.2,
          photo: null,
          color: "Caramelo",
          microchip: null,
          notes: null,
          routine: ["passeio"],
          card: {
            shareBreed: true,
            shareCity: true,
            shareHealth: true,
            contact: "11999990000",
          },
          lostMode: {
            active: false,
            since: null,
            note: null,
          },
          createdAt: "2026-10-28T10:00:00.000Z",
          updatedAt: "2026-10-28T10:00:00.000Z",
        },
      ],
      activePetId: "pet-1",
      records: [
        {
          id: "rec-1",
          petId: "pet-1",
          type: "vacina",
          title: "Vacina V10",
          date: "2026-01-10",
          nextDueDate: "2027-01-10",
          leadDays: 21,
          recurrenceMonths: 12,
          professional: "Dra. Camila",
          notes: null,
          attachmentName: null,
          attachmentData: null,
          weightKg: null,
          completedAt: null,
          createdAt: "2026-10-28T10:00:00.000Z",
          updatedAt: "2026-10-28T10:00:00.000Z",
        },
      ],
      documents: [
        {
          id: "doc-1",
          petId: "pet-1",
          title: "Hemograma completo",
          category: "exame",
          date: "2026-10-01",
          notes: null,
          mediaId: "file-1",
          fileName: "hemograma.pdf",
          mimeType: "application/pdf",
          sizeBytes: 9,
          createdAt: "2026-10-28T10:00:00.000Z",
          updatedAt: "2026-10-28T10:00:00.000Z",
          deletedAt: null,
        },
      ],
    },
    {
      "file-1": SAMPLE_PDF_DATA_URL,
    },
  );
}

describe("sincronização incremental (Delta Sync)", () => {
  it("calcula apenas os registros alterados e omite blobs de arquivos inalterados", () => {
    const base = createBaseBackup();
    const next = structuredClone(base);
    next.exportedAt = "2026-10-28T12:00:00.000Z";
    next.pets[0].weightKg = 14.8;
    next.pets[0].updatedAt = "2026-10-28T11:30:00.000Z";
    next.places.push({
      id: "place-local-1",
      name: "Hospital 24h Amigo Fiel",
      category: "veterinario",
      city: "São Paulo",
      neighborhood: "Pinheiros",
      address: "Rua dos Pinheiros, 500",
      lat: -23.565,
      lng: -46.68,
      notes: "Plantão 24h de confiança",
      phone: "1130001111",
      whatsapp: "11988887777",
      favorite: true,
      source: "local",
      attributes: ["emergencia_24h", "equipe_paciente"],
      priceLevel: 3,
      verified: false,
      openNow: true,
      seeded: false,
      createdAt: "2026-10-28T11:45:00.000Z",
      updatedAt: "2026-10-28T11:45:00.000Z",
    });

    const { delta, stats } = computeBackupDelta(base, next);
    expect(stats.changedRecords).toBe(2);
    expect(delta.upserts.pets).toHaveLength(1);
    expect(delta.upserts.places).toHaveLength(1);
    expect(delta.upserts.records).toHaveLength(0);
    expect(stats.skippedFiles).toBe(1);
    expect(delta.files).toEqual({});

    const applied = applyBackupDelta(base, delta);
    expect(applied.pets[0].weightKg).toBe(14.8);
    expect(applied.places).toHaveLength(1);
    expect(applied.places[0].name).toBe("Hospital 24h Amigo Fiel");
    expect(applied.files["file-1"]).toBe(SAMPLE_PDF_DATA_URL);
  });

  it("propaga tombstones de exclusão e limpa registros excluídos", () => {
    const base = createBaseBackup();
    const next = structuredClone(base);
    next.records = [];
    next.syncTombstones = [
      {
        collection: "records",
        id: "rec-1",
        deletedAt: "2026-10-28T12:10:00.000Z",
      },
    ];

    const { delta, stats } = computeBackupDelta(base, next);
    expect(stats.deletedRecords).toBe(1);

    const applied = applyBackupDelta(base, delta);
    expect(applied.records).toHaveLength(0);
    expect(applied.syncTombstones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ collection: "records", id: "rec-1" }),
      ]),
    );
  });

  it("mescla alterações concorrentes entre dois aparelhos em nível de registro por updatedAt", () => {
    const base = createBaseBackup();

    // Aparelho A: atualiza peso do pet e adiciona um lembrete
    const deviceA = structuredClone(base);
    deviceA.pets[0].weightKg = 15.1;
    deviceA.pets[0].updatedAt = "2026-10-28T14:00:00.000Z";
    deviceA.reminders.push({
      id: "rem-a",
      petId: "pet-1",
      title: "Comprar antipulgas",
      kind: "saude",
      dueDate: "2026-11-05",
      leadDays: 3,
      notes: null,
      done: false,
      completedAt: null,
      createdAt: "2026-10-28T14:00:00.000Z",
      updatedAt: "2026-10-28T14:00:00.000Z",
    });

    // Aparelho B: adiciona entrada no diário e cadastra farmácia favorita
    const deviceB = structuredClone(base);
    deviceB.diary.push({
      id: "diary-b",
      petId: "pet-1",
      date: "2026-10-28",
      text: "Passeio longo no parque sem cansaço.",
      photo: null,
      tags: ["passeio"],
      place: "Parque Ibirapuera",
      weightKg: null,
      visibility: "privado",
      createdAt: "2026-10-28T13:30:00.000Z",
      updatedAt: "2026-10-28T13:30:00.000Z",
    });
    deviceB.places.push({
      id: "place-b",
      name: "Farmácia ManipulaPet",
      category: "farmacia",
      city: "São Paulo",
      neighborhood: "Moema",
      address: "Av. Ibirapuera, 1000",
      lat: -23.6,
      lng: -46.66,
      notes: "Manipulação veterinária rápida",
      phone: "1150501234",
      whatsapp: "11977776666",
      favorite: true,
      source: "local",
      attributes: ["equipe_paciente"],
      priceLevel: 2,
      verified: false,
      openNow: true,
      seeded: false,
      createdAt: "2026-10-28T13:40:00.000Z",
      updatedAt: "2026-10-28T13:40:00.000Z",
    });

    const { merged } = mergeBackupsByRecord(deviceA, deviceB);
    expect(merged.pets[0].weightKg).toBe(15.1);
    expect(merged.reminders.map((item) => item.id)).toContain("rem-a");
    expect(merged.diary.map((item) => item.id)).toContain("diary-b");
    expect(merged.places.map((item) => item.id)).toContain("place-b");
    expect(merged.documents.map((item) => item.id)).toContain("doc-1");
  });
});
