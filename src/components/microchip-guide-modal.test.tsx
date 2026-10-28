import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MicrochipGuideModal } from "./microchip-guide-modal";

describe("MicrochipGuideModal component", () => {
  it("renders trigger button and opens dialog with national databases", () => {
    render(
      <MicrochipGuideModal
        microchip="981098102345678"
        petName="Pipoca"
      />,
    );

    // Initial trigger button exists
    const trigger = screen.getByRole("button", {
      name: /Guia de Microchip Nacional/i,
    });
    expect(trigger).toBeInTheDocument();

    // Open modal
    fireEvent.click(trigger);

    // Header and databases are displayed
    expect(
      screen.getByRole("heading", { name: "Guia de Microchip Nacional" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SIRAA")).toBeInTheDocument();
    expect(screen.getByText("Abrasp")).toBeInTheDocument();
    expect(screen.getByText("PetMaxx")).toBeInTheDocument();

    // Formatted microchip is visible
    expect(screen.getByText("981 098 102 345 678")).toBeInTheDocument();
  });

  it("renders controlled open state correctly", () => {
    render(
      <MicrochipGuideModal
        open={true}
        onClose={() => {}}
        microchip="981098102345678"
        petName="Pipoca"
      />,
    );

    expect(screen.getByText("Guia de Microchip Nacional")).toBeInTheDocument();
    expect(
      screen.getByText(/Como consultar e localizar tutores/),
    ).toBeInTheDocument();
  });
});
