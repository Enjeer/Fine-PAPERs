import { useEffect, useState } from "react";
import GraphsConstructor, { type dataEntry } from "@/lib/GraphsConstructor";
import { sampleMathExpression } from "@/lib/math-expression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
};

type ChartType = "linear" | "area" | "bar" | "scatter" | "pie";
type ChartPoint = Record<string, unknown> & { x: string; y: unknown };
type ChartSeries = Record<string, unknown> & {
  id: string;
  name: string;
  points: ChartPoint[];
};

const chartTypes: readonly ChartType[] = [
  "linear",
  "area",
  "bar",
  "scatter",
  "pie",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChartType(value: unknown): value is ChartType {
  return typeof value === "string" && chartTypes.includes(value as ChartType);
}

function readSeries(value: unknown): ChartSeries[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((entry, index) => ({
    ...entry,
    id: typeof entry.id === "string" ? entry.id : `series-${index}`,
    name: typeof entry.name === "string" ? entry.name : `Ряд ${index + 1}`,
    points: Array.isArray(entry.points)
      ? entry.points
          .filter(isRecord)
          .map((point) => ({
            ...point,
            x: point.x === undefined || point.x === null ? "" : String(point.x),
            y: point.y,
          }))
      : [],
  }));
}

function chartEntries(series: ChartSeries[]): dataEntry[] {
  return series.map((entry) => ({
    id: entry.id,
    name: entry.name,
    data: entry.points.flatMap((point) => {
      if (!point.x.trim() || point.y === null || point.y === undefined) return [];
      const y = typeof point.y === "number" ? point.y : Number(point.y);
      return Number.isFinite(y) ? [{ x: point.x, y }] : [];
    }),
  }));
}

export default function ChartBlockEditor({ content, onChange }: Props) {
  const series = readSeries(content.series);
  const rawChartType = content.chartType;
  const chartType = isChartType(rawChartType) ? rawChartType : "linear";
  const savedFunction = isRecord(content.function) ? content.function : {};
  const [expression, setExpression] = useState(
    typeof savedFunction.expression === "string" ? savedFunction.expression : "",
  );
  const [minimum, setMinimum] = useState(
    typeof savedFunction.minimum === "number" ? String(savedFunction.minimum) : "-10",
  );
  const [maximum, setMaximum] = useState(
    typeof savedFunction.maximum === "number" ? String(savedFunction.maximum) : "10",
  );
  const [functionError, setFunctionError] = useState("");

  useEffect(() => {
    setExpression(
      typeof savedFunction.expression === "string" ? savedFunction.expression : "",
    );
    setMinimum(
      typeof savedFunction.minimum === "number" ? String(savedFunction.minimum) : "-10",
    );
    setMaximum(
      typeof savedFunction.maximum === "number" ? String(savedFunction.maximum) : "10",
    );
  }, [savedFunction.expression, savedFunction.minimum, savedFunction.maximum]);

  function updateSeries(nextSeries: ChartSeries[]) {
    onChange({ ...content, series: nextSeries });
  }

  function updatePoint(
    seriesIndex: number,
    pointIndex: number,
    patch: Partial<ChartPoint>,
  ) {
    updateSeries(
      series.map((entry, index) =>
        index === seriesIndex
          ? {
              ...entry,
              points: entry.points.map((point, index) =>
                index === pointIndex ? { ...point, ...patch } : point,
              ),
            }
          : entry,
      ),
    );
  }

  function buildFunction() {
    try {
      const start = Number(minimum);
      const end = Number(maximum);
      const points = sampleMathExpression(expression, start, end);
      const existingFunction = isRecord(content.function) ? content.function : {};
      const seriesId =
        typeof existingFunction.seriesId === "string"
          ? existingFunction.seriesId
          : `function-${crypto.randomUUID()}`;
      const functionSeries: ChartSeries = {
        id: seriesId,
        name: expression.trim(),
        points,
      };
      const otherSeries = series.filter((entry) => entry.id !== seriesId);
      setFunctionError("");
      onChange({
        ...content,
        chartType: "scatter",
        series: [...otherSeries, functionSeries],
        function: {
          expression: expression.trim(),
          minimum: start,
          maximum: end,
          seriesId,
        },
      });
    } catch (error) {
      setFunctionError(
        error instanceof Error ? error.message : "Не удалось построить график функции.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={typeof content.title === "string" ? content.title : ""}
          onChange={(event) => onChange({ ...content, title: event.target.value })}
          placeholder="Название графика"
          aria-label="Название графика"
        />
        <Input
          value={typeof content.description === "string" ? content.description : ""}
          onChange={(event) =>
            onChange({ ...content, description: event.target.value })
          }
          placeholder="Описание"
          aria-label="Описание графика"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          Тип графика
          <select
            className="h-10 w-full rounded-md border bg-background px-2 text-sm text-foreground"
            value={chartType}
            onChange={(event) =>
              onChange({ ...content, chartType: event.target.value })
            }
            aria-label="Тип графика"
          >
            <option value="linear">Линейный</option>
            <option value="area">С областями</option>
            <option value="bar">Столбчатый</option>
            <option value="scatter">Точечный</option>
            <option value="pie">Круговой</option>
          </select>
        </label>
        <Input
          value={typeof content.xAxis === "string" ? content.xAxis : ""}
          onChange={(event) => onChange({ ...content, xAxis: event.target.value })}
          placeholder="Подпись оси X"
          aria-label="Подпись оси X"
        />
        <Input
          value={typeof content.yAxis === "string" ? content.yAxis : ""}
          onChange={(event) => onChange({ ...content, yAxis: event.target.value })}
          placeholder="Подпись оси Y"
          aria-label="Подпись оси Y"
        />
      </div>

      <section className="space-y-3 rounded-md border p-3" aria-label="Ряды данных">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Данные графика</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              updateSeries([
                ...series,
                {
                  id: `series-${crypto.randomUUID()}`,
                  name: `Ряд ${series.length + 1}`,
                  points: [],
                },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Добавить ряд
          </Button>
        </div>

        {series.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Добавьте ряд и точки данных или постройте функцию ниже.
          </p>
        )}

        {series.map((entry, seriesIndex) => (
          <fieldset
            key={entry.id}
            className="space-y-3 rounded-md border p-3"
          >
            <legend className="sr-only">Ряд {seriesIndex + 1}</legend>
            <div className="flex items-center gap-2">
              <Input
                value={entry.name}
                onChange={(event) =>
                  updateSeries(
                    series.map((item, index) =>
                      index === seriesIndex
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
                aria-label={`Название ряда ${seriesIndex + 1}`}
                placeholder={`Ряд ${seriesIndex + 1}`}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() =>
                  updateSeries(series.filter((_, index) => index !== seriesIndex))
                }
                aria-label={`Удалить ряд ${seriesIndex + 1}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {entry.points.map((point, pointIndex) => (
              <div
                key={`${entry.id}-point-${pointIndex}`}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
              >
                <Input
                  value={point.x}
                  onChange={(event) =>
                    updatePoint(seriesIndex, pointIndex, { x: event.target.value })
                  }
                  aria-label={`Ряд ${seriesIndex + 1}, точка ${pointIndex + 1}, X`}
                  placeholder="X"
                />
                <Input
                  type="number"
                  step="any"
                  value={
                    typeof point.y === "number" || typeof point.y === "string"
                      ? point.y
                      : ""
                  }
                  onChange={(event) =>
                    updatePoint(seriesIndex, pointIndex, {
                      y: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                  aria-label={`Ряд ${seriesIndex + 1}, точка ${pointIndex + 1}, Y`}
                  placeholder="Y"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    updateSeries(
                      series.map((item, index) =>
                        index === seriesIndex
                          ? {
                              ...item,
                              points: item.points.filter(
                                (_, index) => index !== pointIndex,
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                  aria-label={`Удалить точку ${pointIndex + 1} из ряда ${seriesIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                updateSeries(
                  series.map((item, index) =>
                    index === seriesIndex
                      ? {
                          ...item,
                          points: [...item.points, { x: "", y: null }],
                        }
                      : item,
                  ),
                )
              }
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Добавить точку
            </Button>
          </fieldset>
        ))}
      </section>

      <section className="space-y-3 rounded-md border p-3" aria-label="График функции">
        <h3 className="text-sm font-semibold">Построить функцию</h3>
        <p className="text-xs text-muted-foreground">
          Поддерживаются числа, X, π, e, скобки, +, −, *, /, ^ и функции
          sin, cos, tan, sqrt, abs, ln, log, exp.
        </p>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
          <Input
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            aria-label="Математическое выражение"
            placeholder="Например: x^2 или sin(x)"
          />
          <Input
            type="number"
            step="any"
            value={minimum}
            onChange={(event) => setMinimum(event.target.value)}
            aria-label="Минимум X"
            placeholder="От X"
          />
          <Input
            type="number"
            step="any"
            value={maximum}
            onChange={(event) => setMaximum(event.target.value)}
            aria-label="Максимум X"
            placeholder="До X"
          />
        </div>
        <Button type="button" variant="outline" onClick={buildFunction}>
          Построить график функции
        </Button>
        {functionError && (
          <p className="text-sm text-destructive" role="alert">
            {functionError}
          </p>
        )}
      </section>

      {content.isDemonstration === true && (
        <p className="text-xs text-amber-700">
          Демонстрационные данные — не являются фактической статистикой.
        </p>
      )}
      <GraphsConstructor
        id="editor-chart"
        type={chartType}
        dataEntries={chartEntries(series)}
        xAxis={typeof content.xAxis === "string" ? content.xAxis : undefined}
        yAxis={typeof content.yAxis === "string" ? content.yAxis : undefined}
      />
    </div>
  );
}
