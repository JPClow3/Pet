import { describe, expect, it } from "vitest";
import {
  FIRST_AID_GUIDES,
  FOOD_SAFETY_ITEMS,
  searchFirstAidGuides,
  searchFoodSafetyItems,
} from "./first-aid";

describe("Guia offline de Primeiros Socorros e Alimentos Tóxicos", () => {
  it("encontra alimentos letais e tóxicos em buscas de pânico sem diferenciar acentos", () => {
    const uva = searchFoodSafetyItems("uva");
    expect(uva.length).toBeGreaterThan(0);
    expect(uva[0].id).toBe("uva-passa");
    expect(uva[0].risk).toBe("letal");

    const xilitol = searchFoodSafetyItems("adoçante xilitol");
    expect(xilitol[0].id).toBe("xilitol");
    expect(xilitol[0].risk).toBe("letal");

    const cebola = searchFoodSafetyItems("cebola");
    expect(cebola[0].id).toBe("cebola-alho");
    expect(cebola[0].risk).toBe("toxico");

    const lirio = searchFoodSafetyItems("lirio", { species: "gato" });
    expect(lirio[0].id).toBe("lirios");
    expect(lirio[0].risk).toBe("letal");
  });

  it("filtra por espécie e nível de risco corretamente", () => {
    const seguros = searchFoodSafetyItems("", { risk: "seguro" });
    expect(seguros.length).toBeGreaterThanOrEqual(4);
    expect(seguros.every((item) => item.risk === "seguro")).toBe(true);

    const gatosLetais = searchFoodSafetyItems("", {
      species: "gato",
      risk: "letal",
    });
    expect(gatosLetais.some((item) => item.id === "lirios")).toBe(true);
    expect(gatosLetais.some((item) => item.id === "permetrina")).toBe(true);
    expect(gatosLetais.some((item) => item.id === "xilitol")).toBe(false);
  });

  it("busca protocolos de primeiros socorros por sintomas e palavras-chave", () => {
    expect(FOOD_SAFETY_ITEMS.length).toBeGreaterThanOrEqual(15);
    expect(FIRST_AID_GUIDES.length).toBeGreaterThanOrEqual(6);

    const engasgo = searchFirstAidGuides("osso preso sem respirar");
    expect(engasgo).toHaveLength(1);
    expect(engasgo[0].id).toBe("engasgo");

    const convulsao = searchFirstAidGuides("convulsao tremendo");
    expect(convulsao[0].id).toBe("convulsao");
  });
});
