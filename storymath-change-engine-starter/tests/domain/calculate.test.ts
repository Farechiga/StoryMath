import { describe, it, expect } from "vitest";
import { calculate, formatNumber, unitsCompatible } from "../../src/domain";
import { numbersEqual } from "../../src/domain/calculate";

describe("calculate", () => {
  it("adds", () => {
    expect(calculate("+", 384, 128)).toBe(512);
  });
  it("subtracts", () => {
    expect(calculate("-", 384, 128)).toBe(256);
  });
  it("multiplies", () => {
    expect(calculate("×", 384, 128)).toBe(49152);
  });
  it("divides", () => {
    expect(calculate("÷", 384, 128)).toBe(3);
    expect(calculate("÷", 384, 256)).toBe(1.5);
  });
  it("throws on divide by zero", () => {
    expect(() => calculate("÷", 5, 0)).toThrow();
  });
});

describe("formatNumber", () => {
  it("adds thousands separators to whole numbers", () => {
    expect(formatNumber(49152)).toBe("49,152");
    expect(formatNumber(640)).toBe("640");
  });
  it("keeps small decimals", () => {
    expect(formatNumber(1.5)).toBe("1.5");
  });
});

describe("unitsCompatible", () => {
  it("is case/space insensitive", () => {
    expect(unitsCompatible("meters", " Meters ")).toBe(true);
    expect(unitsCompatible("meters", "pages")).toBe(false);
  });
});

describe("numbersEqual", () => {
  it("matches integers and float results within tolerance", () => {
    expect(numbersEqual(640, 640)).toBe(true);
    expect(numbersEqual(0.1 + 0.2, 0.3)).toBe(true); // classic float drift
    expect(numbersEqual(calculate("÷", 384, 256), 1.5)).toBe(true);
    expect(numbersEqual(256, 255)).toBe(false);
  });
});
