import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeightChart } from "@/components/weight-chart";

describe("WeightChart", () => {
  it("shows empty state when no measurements exist", () => {
    render(<WeightChart measurements={[]} />);
    expect(
      screen.getByText("Sem pesagens registradas"),
    ).toBeInTheDocument();
  });

  it("renders single measurement and advice for more records", () => {
    render(
      <WeightChart
        measurements={[{ date: "2026-02-10", weightKg: 12.4 }]}
        targetWeightKg={12.0}
      />,
    );
    expect(screen.getByText("12,4 kg")).toBeInTheDocument();
    expect(screen.getByText(/Meta: 12,0 kg/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Registre mais pesagens nos próximos meses para ver a curva completa de evolução.",
      ),
    ).toBeInTheDocument();
  });

  it("renders multiple points and target weight reference line", () => {
    render(
      <WeightChart
        measurements={[
          { date: "2026-01-01", weightKg: 12.0 },
          { date: "2026-02-01", weightKg: 12.3 },
          { date: "2026-03-01", weightKg: 12.1 },
        ]}
        targetWeightKg={11.8}
        petName="Pipoca"
      />,
    );
    expect(screen.getByText("12,1 kg")).toBeInTheDocument();
    expect(screen.getByText(/Meta: 11,8 kg/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Gráfico de evolução de peso de Pipoca",
      }),
    ).toBeInTheDocument();
  });

  it("displays clinical alert when sudden weight change is detected", () => {
    render(
      <WeightChart
        measurements={[
          { date: "2026-01-01", weightKg: 10.0 },
          { date: "2026-01-20", weightKg: 8.8 }, // 12% drop
        ]}
      />,
    );
    expect(
      screen.getByText(/Variação de 12,0% detectada/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Variações bruscas de peso são o primeiro sinal clínico/),
    ).toBeInTheDocument();
  });

  it("deduplicates same-date measurements by keeping the latest at timestamp", () => {
    render(
      <WeightChart
        measurements={[
          { date: "2026-01-01", weightKg: 10.0, at: "2026-01-01T08:00:00Z" },
          { date: "2026-01-01", weightKg: 10.5, at: "2026-01-01T15:00:00Z" },
        ]}
      />,
    );
    expect(screen.getByText("10,5 kg")).toBeInTheDocument();
  });

  it("avoids middle date text collision when dates are heavily skewed", () => {
    const { container } = render(
      <WeightChart
        measurements={[
          { date: "2026-01-01", weightKg: 10.0 },
          { date: "2026-01-02", weightKg: 10.1 },
          { date: "2026-12-31", weightKg: 10.2 },
        ]}
      />,
    );
    // Since day 2 is 1 day after day 1, distance is < 60px; middle label should be omitted to prevent text overlap
    const middleLabels = container.querySelectorAll("text");
    const texts = Array.from(middleLabels).map((t) => t.textContent);
    // Should render start (01/01/2026) and end (31/12/2026), but omit the colliding middle
    expect(texts.some((t) => t?.includes("01/01/2026"))).toBe(true);
    expect(texts.some((t) => t?.includes("31/12/2026"))).toBe(true);
    expect(texts.some((t) => t?.includes("02/01/2026"))).toBe(false);
  });
});
