import { describe, expect, it } from "vitest";
import { calculateResizeDimensions } from "./image";

describe("calculateResizeDimensions", () => {
  it("keeps image dimensions if smaller than maxSize", () => {
    const result = calculateResizeDimensions(800, 600, 1600);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.scale).toBe(1);
  });

  it("scales down landscape images so width equals maxSize", () => {
    const result = calculateResizeDimensions(3200, 2400, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
    expect(result.scale).toBe(0.5);
  });

  it("scales down portrait images so height equals maxSize", () => {
    const result = calculateResizeDimensions(2400, 3200, 1600);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(1600);
    expect(result.scale).toBe(0.5);
  });

  it("scales down square images to maxSize", () => {
    const result = calculateResizeDimensions(4000, 4000, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1600);
    expect(result.scale).toBe(0.4);
  });

  it("handles non-positive dimensions gracefully", () => {
    expect(calculateResizeDimensions(0, 0, 1600)).toEqual({
      width: 0,
      height: 0,
      scale: 1,
    });
    expect(calculateResizeDimensions(-10, 100, 1600)).toEqual({
      width: 0,
      height: 0,
      scale: 1,
    });
    expect(calculateResizeDimensions(100, -10, 1600)).toEqual({
      width: 0,
      height: 0,
      scale: 1,
    });
  });
});
