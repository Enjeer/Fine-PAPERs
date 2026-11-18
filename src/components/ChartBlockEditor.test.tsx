import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ChartBlockEditor from "./ChartBlockEditor";

vi.mock("@/lib/GraphsConstructor", () => ({
  default: () => <div>Chart preview</div>,
}));

function Harness({ onChange }: { onChange: (content: Record<string, unknown>) => void }) {
  const [content, setContent] = useState<Record<string, unknown>>({
    chartType: "linear",
    series: [],
  });
  return (
    <ChartBlockEditor
      content={content}
      onChange={(next) => {
        onChange(next);
        setContent(next);
      }}
    />
  );
}

describe("ChartBlockEditor", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("builds a function series using the existing scatter point format", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "function-id" });
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Математическое выражение"), {
      target: { value: "x^2" },
    });
    fireEvent.change(screen.getByLabelText("Минимум X"), {
      target: { value: "-1" },
    });
    fireEvent.change(screen.getByLabelText("Максимум X"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Построить график функции" }));

    const result = onChange.mock.lastCall?.[0];
    expect(result.chartType).toBe("scatter");
    expect(result.function).toEqual({
      expression: "x^2",
      minimum: -1,
      maximum: 1,
      seriesId: "function-function-id",
    });
    expect(result.series[0].points).toHaveLength(41);
    expect(result.series[0].points[0]).toEqual({ x: "-1", y: 1 });
    expect(result.series[0].points[40]).toEqual({ x: "1", y: 1 });
  });

  it("reopens and edits a previously saved data series without JSON", () => {
    const onChange = vi.fn();
    function LegacyChart() {
      const [content, setContent] = useState<Record<string, unknown>>({
        chartType: "linear",
        series: [
          {
            id: "legacy-series",
            name: "Old series",
            points: [{ x: "2024", y: 5 }],
          },
        ],
      });
      return (
        <ChartBlockEditor
          content={content}
          onChange={(next) => {
            onChange(next);
            setContent(next);
          }}
        />
      );
    }

    render(<LegacyChart />);
    expect(screen.getByLabelText("Название ряда 1")).toHaveValue("Old series");
    fireEvent.change(
      screen.getByLabelText("Ряд 1, точка 1, Y"),
      { target: { value: "7" } },
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        series: [
          {
            id: "legacy-series",
            name: "Old series",
            points: [{ x: "2024", y: 7 }],
          },
        ],
      }),
    );
  });

  it("adds and removes series and points in the existing data format", () => {
    let id = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        id += 1;
        return String(id);
      },
    });
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Добавить ряд" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить точку" }));
    fireEvent.change(screen.getByLabelText("Ряд 1, точка 1, X"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Ряд 1, точка 1, Y"), {
      target: { value: "4" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        series: [
          {
            id: "series-1",
            name: "Ряд 1",
            points: [{ x: "2", y: 4 }],
          },
        ],
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Удалить точку 1 из ряда 1" }),
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        series: [{ id: "series-1", name: "Ряд 1", points: [] }],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Удалить ряд 1" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ series: [] }),
    );
  });
});
