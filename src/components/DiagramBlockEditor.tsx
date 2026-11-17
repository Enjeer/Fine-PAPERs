import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default function DiagramBlockEditor({ content, onChange }: Props) {
  const [dataText, setDataText] = useState(
    JSON.stringify(
      { nodes: content.nodes || [], edges: content.edges || [] },
      null,
      2,
    ),
  );
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    setDataText(
      JSON.stringify(
        { nodes: content.nodes || [], edges: content.edges || [] },
        null,
        2,
      ),
    );
  }, [content.nodes, content.edges]);

  const updateData = (value: string) => {
    setDataText(value);
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        !isRecord(parsed) ||
        !Array.isArray(parsed.nodes) ||
        !Array.isArray(parsed.edges)
      ) {
        throw new Error("Нужны массивы nodes и edges");
      }
      if (!parsed.nodes.every(isRecord) || !parsed.edges.every(isRecord)) {
        throw new Error("Элементы nodes и edges должны быть объектами");
      }
      setJsonError("");
      onChange({ ...content, ...parsed });
    } catch (error) {
      setJsonError(
        error instanceof Error ? error.message : "Некорректный JSON диаграммы",
      );
    }
  };

  const nodes = Array.isArray(content.nodes)
    ? content.nodes.filter(isRecord)
    : [];
  const edges = Array.isArray(content.edges)
    ? content.edges.filter(isRecord)
    : [];
  const labels = new Map(
    nodes.map((node) => [String(node.id), String(node.label || "")]),
  );

  return (
    <div className="space-y-3">
      <Input
        value={typeof content.title === "string" ? content.title : ""}
        onChange={(event) => onChange({ ...content, title: event.target.value })}
        placeholder="Название диаграммы"
        aria-label="Название диаграммы"
      />
      <div className="flex flex-wrap gap-2">
        {nodes.map((node) => (
          <div
            key={String(node.id)}
            className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
          >
            {String(node.label || "")}
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-sm">
        {edges.map((edge, index) => (
          <li key={`${edge.from}-${edge.to}-${index}`}>
            {labels.get(String(edge.from)) || String(edge.from)} →{" "}
            {labels.get(String(edge.to)) || String(edge.to)}
            {edge.label ? ` · ${String(edge.label)}` : ""}
          </li>
        ))}
      </ul>
      <Textarea
        value={dataText}
        onChange={(event) => updateData(event.target.value)}
        rows={8}
        aria-label="Данные диаграммы в JSON"
        className="font-mono text-xs"
      />
      {jsonError && <p className="text-xs text-destructive" role="alert">{jsonError}</p>}
    </div>
  );
}
