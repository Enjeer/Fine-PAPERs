import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
};

type DiagramNode = Record<string, unknown> & { id: string; label: string };
type DiagramEdge = Record<string, unknown> & {
  from: string;
  to: string;
  label?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNodes(value: unknown): DiagramNode[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((node) => {
    if (typeof node.id !== "string") return [];
    return [
      {
        ...node,
        id: node.id,
        label: typeof node.label === "string" ? node.label : "",
      },
    ];
  });
}

function readEdges(value: unknown): DiagramEdge[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((edge) => {
    if (typeof edge.from !== "string" || typeof edge.to !== "string") return [];
    return [
      {
        ...edge,
        from: edge.from,
        to: edge.to,
        label: typeof edge.label === "string" ? edge.label : "",
      },
    ];
  });
}

export default function DiagramBlockEditor({ content, onChange }: Props) {
  const nodes = readNodes(content.nodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = readEdges(content.edges).filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to),
  );
  const diagramType =
    content.diagramType === "sequence" ? "sequence" : "flowchart";

  function updateNodes(nextNodes: DiagramNode[]) {
    const ids = new Set(nextNodes.map((node) => node.id));
    onChange({
      ...content,
      nodes: nextNodes,
      edges: edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
    });
  }

  function updateEdges(nextEdges: DiagramEdge[]) {
    onChange({ ...content, edges: nextEdges });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={typeof content.title === "string" ? content.title : ""}
          onChange={(event) => onChange({ ...content, title: event.target.value })}
          aria-label="Название диаграммы"
          placeholder="Название диаграммы"
        />
        <label className="space-y-1 text-xs text-muted-foreground">
          Вид диаграммы
          <select
            className="h-10 w-full rounded-md border bg-background px-2 text-sm text-foreground"
            value={diagramType}
            onChange={(event) =>
              onChange({ ...content, diagramType: event.target.value })
            }
            aria-label="Вид диаграммы"
          >
            <option value="flowchart">Блок-схема</option>
            <option value="sequence">Последовательность</option>
          </select>
        </label>
      </div>

      <section className="space-y-3 rounded-md border p-3" aria-label="Элементы диаграммы">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Элементы</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              updateNodes([
                ...nodes,
                {
                  id: `node-${crypto.randomUUID()}`,
                  label: `Элемент ${nodes.length + 1}`,
                },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Добавить элемент
          </Button>
        </div>

        {nodes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Добавьте первый элемент диаграммы.
          </p>
        )}

        {nodes.map((node, index) => (
          <div key={node.id} className="flex items-center gap-2">
            <Input
              value={node.label}
              onChange={(event) =>
                updateNodes(
                  nodes.map((item, nodeIndex) =>
                    nodeIndex === index
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                )
              }
              aria-label={`Название элемента ${index + 1}`}
              placeholder={`Элемент ${index + 1}`}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => updateNodes(nodes.filter((_, i) => i !== index))}
              aria-label={`Удалить элемент ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-md border p-3" aria-label="Связи диаграммы">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Связи</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={nodes.length < 2}
            onClick={() =>
              updateEdges([
                ...edges,
                {
                  from: nodes[0].id,
                  to: nodes[1].id,
                  label: "",
                },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Добавить связь
          </Button>
        </div>

        {edges.map((edge, index) => (
          <div
            key={`${edge.from}-${edge.to}-${index}`}
            className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <select
              className="h-10 min-w-0 rounded-md border bg-background px-2 text-sm"
              value={edge.from}
              onChange={(event) =>
                updateEdges(
                  edges.map((item, edgeIndex) =>
                    edgeIndex === index ? { ...item, from: event.target.value } : item,
                  ),
                )
              }
              aria-label={`Связь ${index + 1}, от элемента`}
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label || node.id}
                </option>
              ))}
            </select>
            <select
              className="h-10 min-w-0 rounded-md border bg-background px-2 text-sm"
              value={edge.to}
              onChange={(event) =>
                updateEdges(
                  edges.map((item, edgeIndex) =>
                    edgeIndex === index ? { ...item, to: event.target.value } : item,
                  ),
                )
              }
              aria-label={`Связь ${index + 1}, к элементу`}
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label || node.id}
                </option>
              ))}
            </select>
            <Input
              value={edge.label ?? ""}
              onChange={(event) =>
                updateEdges(
                  edges.map((item, edgeIndex) =>
                    edgeIndex === index
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                )
              }
              aria-label={`Подпись связи ${index + 1}`}
              placeholder="Подпись связи"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => updateEdges(edges.filter((_, i) => i !== index))}
              aria-label={`Удалить связь ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-md border bg-muted/20 p-3" aria-label="Предварительный просмотр диаграммы">
        <h3 className="text-sm font-semibold">Предварительный просмотр</h3>
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Диаграмма пока пуста.</p>
        ) : (
          <ol className="space-y-2">
            {nodes.map((node, index) => {
              const outgoing = edges.filter((edge) => edge.from === node.id);
              return (
                <li
                  key={node.id}
                  className="rounded border bg-background px-3 py-2 text-sm"
                >
                  <span className="font-medium">
                    {diagramType === "sequence" ? `${index + 1}. ` : ""}
                    {node.label || "Без названия"}
                  </span>
                  {outgoing.length > 0 && (
                    <span className="mt-1 block text-muted-foreground">
                      {outgoing.map((edge) => {
                        const destination =
                          nodes.find((item) => item.id === edge.to)?.label || edge.to;
                        return `${edge.label ? `${edge.label}: ` : ""}${destination}`;
                      }).join(" · ")}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
