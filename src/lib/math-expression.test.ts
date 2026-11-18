import { describe, expect, it } from "vitest";
import {
  evaluateMathExpression,
  sampleMathExpression,
} from "./math-expression";

describe("safe mathematical expression parser", () => {
  it("evaluates arithmetic, powers, and supported functions", () => {
    expect(evaluateMathExpression("2*x+1", 3)).toBe(7);
    expect(evaluateMathExpression("x^2", -4)).toBe(16);
    expect(evaluateMathExpression("sin(pi/2)", 0)).toBeCloseTo(1);
    expect(evaluateMathExpression("sqrt(abs(x))", -9)).toBe(3);
  });

  it("samples a finite range in the existing chart point shape", () => {
    expect(sampleMathExpression("x", -1, 1, 3)).toEqual([
      { x: "-1", y: -1 },
      { x: "0", y: 0 },
      { x: "1", y: 1 },
    ]);
  });

  it("rejects executable input, invalid math, and unbounded ranges", () => {
    expect(() => evaluateMathExpression("globalThis.alert(1)", 0)).toThrow();
    expect(() => evaluateMathExpression("1/0", 0)).toThrow("Деление на ноль.");
    expect(() => evaluateMathExpression("sqrt(-1)", 0)).toThrow(
      "Результат выражения не является конечным числом.",
    );
    expect(() => sampleMathExpression("x", -1_000_001, 1)).toThrow(
      "Укажите корректный диапазон X",
    );
  });
});
