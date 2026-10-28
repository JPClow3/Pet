import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BatchCareModal } from "@/components/batch-care-modal";
import type { Pet } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";

async function resetStore() {
  await useAppStore.setState(useAppStore.getInitialState(), true);
}

const mockPets: Pet[] = [
  {
    id: "pet-1",
    name: "Thor",
    species: "cao",
    sex: "macho",
    breed: null,
    birthDate: null,
    weightKg: 30,
    photo: null,
    color: null,
    microchip: null,
    notes: null,
    routine: [],
    card: {
      shareBreed: false,
      shareCity: false,
      shareHealth: false,
      contact: null,
    },
    lostMode: { active: false, since: null, note: null },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "pet-2",
    name: "Luna",
    species: "cao",
    sex: "femea",
    breed: null,
    birthDate: null,
    weightKg: 20,
    photo: null,
    color: null,
    microchip: null,
    notes: null,
    routine: [],
    card: {
      shareBreed: false,
      shareCity: false,
      shareHealth: false,
      contact: null,
    },
    lostMode: { active: false, since: null, note: null },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("BatchCareModal", () => {
  beforeEach(async () => {
    await resetStore();
    // Add pets to store so batchRecordCare validates them
    for (const pet of mockPets) {
      await useAppStore.getState().addPet({
        name: pet.name,
        species: pet.species,
        sex: pet.sex,
      });
    }
  });

  it("renders presets and allows executing batch care for selected pets", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    const actualPets = useAppStore.getState().pets;

    render(
      <BatchCareModal
        open={true}
        onClose={handleClose}
        pets={actualPets}
      />,
    );

    // Check presets are visible
    expect(screen.getByText("Passeio matinal")).toBeInTheDocument();
    expect(screen.getByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText("Escovação de dentes")).toBeInTheDocument();

    // Check both pets are listed
    expect(screen.getByText("Thor")).toBeInTheDocument();
    expect(screen.getByText("Luna")).toBeInTheDocument();

    // Click to execute default preset (Passeio matinal)
    const submitBtn = screen.getByRole("button", {
      name: /registrar "passeio matinal" para 2 pets/i,
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled();
      const records = useAppStore.getState().records;
      const thorRecord = records.find(
        (r) => r.petId === actualPets[0].id && r.title === "Passeio matinal",
      );
      const lunaRecord = records.find(
        (r) => r.petId === actualPets[1].id && r.title === "Passeio matinal",
      );
      expect(thorRecord).toBeDefined();
      expect(lunaRecord).toBeDefined();
    });
  });
});
