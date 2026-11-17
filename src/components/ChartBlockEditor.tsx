import { useEffect, useState } from "react";
import GraphsConstructor, { type dataEntry } from "@/lib/GraphsConstructor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
};

type ChartType = "linear" | "area" | "bar" | "scatter" | "pie";
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

function isChartType(value: string): value is ChartType {
  return chartTypes.includes(value as ChartType);
}

export default function ChartBlockEditor({ content, onChange }: Props) {
  const [seriesText, setSeriesText] = useState(
    JSON.stringify(content.series || [], null, 2),
  );
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    setSeriesText(JSON.stringify(content.series || [], null, 2));
  }, [content.series]);

  const updateSeries = (value: string) => {
    setSeriesText(value);
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error("Ожидается JSON-массив");
      if (!parsed.every(isRecord)) throw new Error("Ряды должны быть объектами");
      setJsonError("");
      onChange({ ...content, series: parsed });
    } catch (error) {
      setJsonError(
        error instanceof Error ? error.message : "Некорректный JSON данных графика",
      );
    }
  };

  const series: dataEntry[] = Array.isArray(content.series)
    ? content.series
        .filter(
          (entry): entry is Record<string, unknown> =>
            isRecord(entry) && Array.isArray(entry.points),
        )
        .map((entry, index) => ({
          id: String(entry.id || `series-${index}`),
          name: String(entry.name || `Ряд ${index + 1}`),
          data: (entry.points as unknown[])
            .filter(
              (point): point is Record<string, unknown> =>
                isRecord(point) &&
                typeof point.x === "string" &&
                Number.isFinite(Number(point.y)),
            )
            .map((point) => ({ x: String(point.x), y: Number(point.y) })),
        }))
    : [];
  const rawChartType = content.chartType;
  const chartType =
    typeof rawChartType === "string" && isChartType(rawChartType)
      ? rawChartType
      : "linear";

  return (
    <div className="space-y-3">
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
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          className="h-10 rounded-md border bg-background px-2 text-sm"
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
        <Input
          value={typeof content.xAxis === "string" ? content.xAxis : ""}
          onChange={(event) => onChange({ ...content, xAxis: event.target.value })}
          placeholder="Ось X"
          aria-label="Ось X"
        />
        <Input
          value={typeof content.yAxis === "string" ? content.yAxis : ""}
          onChange={(event) => onChange({ ...content, yAxis: event.target.value })}
          placeholder="Ось Y"
          aria-label="Ось Y"
        />
      </div>
      {content.isDemonstration === true && (
        <p className="text-xs text-amber-700">
          Демонстрационные данные — не являются фактической статистикой.
        </p>
      )}
      <Textarea
        value={seriesText}
        onChange={(event) => updateSeries(event.target.value)}
        rows={8}
        aria-label="Данные графика в JSON"
        className="font-mono text-xs"
      />
      {jsonError && <p className="text-xs text-destructive" role="alert">{jsonError}</p>}
      <GraphsConstructor
        id="editor-chart"
        type={chartType}
        dataEntries={series}
        xAxis={typeof content.xAxis === "string" ? content.xAxis : undefined}
        yAxis={typeof content.yAxis === "string" ? content.yAxis : undefined}
      />
    </div>
  );
}
