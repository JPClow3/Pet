import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCalendarButton, BulkAddToCalendarButton } from "./add-to-calendar";
import type { CalendarEvent } from "@/lib/calendar";

vi.mock("@/lib/download", () => ({
  downloadText: vi.fn(),
}));

const mockEvent: CalendarEvent = {
  id: "test-vacina-1",
  title: "Vacina: V10 (Pipoca) — Zelupi",
  description: "Dose anual da vacina",
  startDate: "2026-11-20",
  startTime: null,
  location: "Clínica VetCare",
  petName: "Pipoca",
  category: "vacina",
};

describe("AddToCalendarButton", () => {
  it("renders button with accessible label", () => {
    render(<AddToCalendarButton event={mockEvent} />);
    const button = screen.getByRole("button", {
      name: /Adicionar ao Calendário: Vacina: V10/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("opens options sheet when clicked", async () => {
    const user = userEvent.setup();
    render(<AddToCalendarButton event={mockEvent} />);
    const button = screen.getByRole("button", {
      name: /Adicionar ao Calendário: Vacina: V10/i,
    });
    await user.click(button);

    expect(screen.getByText("Google Agenda")).toBeInTheDocument();
    expect(screen.getByText(/Apple Calendar \/ Outros \(\.ics\)/i)).toBeInTheDocument();
    expect(screen.getByText(/alarmes automáticos/i)).toBeInTheDocument();
  });

  it("opens Google Calendar in a new tab when clicked", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<AddToCalendarButton event={mockEvent} />);
    await user.click(
      screen.getByRole("button", { name: /Adicionar ao Calendário/i }),
    );

    const googleBtn = screen.getByText("Google Agenda");
    await user.click(googleBtn);

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("calendar.google.com/calendar/render"),
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("downloads .ics file with native alarms when Apple option clicked", async () => {
    const user = userEvent.setup();
    const { downloadText } = await import("@/lib/download");

    render(<AddToCalendarButton event={mockEvent} />);
    await user.click(
      screen.getByRole("button", { name: /Adicionar ao Calendário/i }),
    );

    const appleBtn = screen.getByText(/Apple Calendar/i);
    await user.click(appleBtn);

    expect(downloadText).toHaveBeenCalledWith(
      expect.stringContaining("BEGIN:VCALENDAR"),
      expect.stringMatching(/\.ics$/),
      "text/calendar;charset=utf-8",
    );
  });
});

describe("BulkAddToCalendarButton", () => {
  it("exports multiple events to .ics", async () => {
    const user = userEvent.setup();
    const { downloadText } = await import("@/lib/download");

    render(
      <BulkAddToCalendarButton
        events={[mockEvent, { ...mockEvent, id: "test-2", title: "Consulta" }]}
        label="Exportar 2 cuidados"
      />,
    );

    const button = screen.getByRole("button", { name: /Exportar 2 cuidados/i });
    await user.click(button);

    expect(downloadText).toHaveBeenCalledWith(
      expect.stringContaining("UID:test-vacina-1"),
      "agenda-cuidados-zelupi.ics",
      "text/calendar;charset=utf-8",
    );
  });
});
