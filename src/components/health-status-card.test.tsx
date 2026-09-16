import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  HealthStatusCard,
  RecordTimelineItem,
} from "@/components/health-status-card";
import { shiftDays, todayKey } from "@/lib/domain/dates";
import type { HealthRecord } from "@/lib/domain/schema";

function record(overrides: Partial<HealthRecord> = {}): HealthRecord {
  return {
    id: "record-1",
    petId: "pet-1",
    type: "vacina",
    title: "Vacina V10",
    date: "2025-09-20",
    nextDueDate: shiftDays(todayKey(), -4),
    leadDays: 30,
    recurrenceMonths: 12,
    professional: "Dra. Marina",
    notes: "Reforço anual sem reação.",
    attachmentName: null,
    attachmentData: null,
    weightKg: null,
    completedAt: null,
    createdAt: "2025-09-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("HealthStatusCard", () => {
  it("pede o primeiro registro quando está vazio", () => {
    render(<HealthStatusCard records={[]} href="/pets/pet-1/health" />);
    expect(screen.getByText("Nenhum cuidado registrado")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/pets/pet-1/health",
    );
  });

  it("destaca o cuidado vencido", () => {
    render(<HealthStatusCard records={[record()]} href="/pets/pet-1/health" />);
    expect(screen.getByText("Vacina V10 está vencido")).toBeInTheDocument();
    expect(screen.getByText(/Venceu em/)).toBeInTheDocument();
  });

  it("tranquiliza quando está tudo em dia", () => {
    render(
      <HealthStatusCard
        records={[record({ nextDueDate: shiftDays(todayKey(), 120) })]}
        href="/pets/pet-1/health"
      />,
    );
    expect(screen.getByText("Tudo em dia por aqui")).toBeInTheDocument();
  });
});

describe("RecordTimelineItem", () => {
  it("mostra profissional, observação e próximo vencimento", () => {
    render(
      <ul>
        <RecordTimelineItem record={record()} />
      </ul>,
    );
    expect(screen.getByText("Vacina V10")).toBeInTheDocument();
    expect(screen.getByText(/Dra. Marina/)).toBeInTheDocument();
    expect(screen.getByText("Reforço anual sem reação.")).toBeInTheDocument();
    expect(screen.getByText(/Próximo:/)).toBeInTheDocument();
  });
});
