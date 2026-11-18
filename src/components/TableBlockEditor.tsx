import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
};

const MIN_SIZE = 1;
const MAX_ROWS = 20;
const MAX_COLUMNS = 10;

function boundedSize(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed)
    ? Math.max(MIN_SIZE, Math.min(maximum, parsed))
    : fallback;
}

export default function TableBlockEditor({ content, onChange }: Props) {
  const rows = boundedSize(content.rows, 2, MAX_ROWS);
  const cols = boundedSize(content.cols, 2, MAX_COLUMNS);
  const storedData = Array.isArray(content.data) ? content.data : [];
  const data = Array.from({ length: rows * cols }, (_, index) => {
    const value = storedData[index];
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : "";
  });

  function updateData(nextRows: number, nextCols: number, nextData: string[]) {
    onChange({
      ...content,
      rows: nextRows,
      cols: nextCols,
      data: nextData,
    });
  }

  function updateCell(row: number, column: number, value: string) {
    const nextData = [...data];
    nextData[row * cols + column] = value;
    updateData(rows, cols, nextData);
  }

  function addRow() {
    updateData(rows + 1, cols, [...data, ...Array(cols).fill("")]);
  }

  function removeRow(row: number) {
    if (rows <= MIN_SIZE) return;
    updateData(
      rows - 1,
      cols,
      data.filter((_, index) => Math.floor(index / cols) !== row),
    );
  }

  function addColumn() {
    if (cols >= MAX_COLUMNS) return;
    const nextData: string[] = [];
    for (let row = 0; row < rows; row += 1) {
      nextData.push(...data.slice(row * cols, row * cols + cols), "");
    }
    updateData(rows, cols + 1, nextData);
  }

  function removeColumn(column: number) {
    if (cols <= MIN_SIZE) return;
    const nextData = data.filter((_, index) => index % cols !== column);
    updateData(rows, cols - 1, nextData);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          Подпись к таблице
          <Input
            value={typeof content.naming === "string" ? content.naming : ""}
            onChange={(event) =>
              onChange({ ...content, naming: event.target.value })
            }
            aria-label="Подпись к таблице"
            placeholder="Название таблицы"
            className="h-8 text-sm text-foreground"
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Примечание
          <Input
            value={typeof content.source === "string" ? content.source : ""}
            onChange={(event) =>
              onChange({ ...content, source: event.target.value })
            }
            aria-label="Примечание к таблице"
            placeholder="Источник или примечание"
            className="h-8 text-sm text-foreground"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addRow}
          disabled={rows >= MAX_ROWS}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Добавить строку
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addColumn}
          disabled={cols >= MAX_COLUMNS}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Добавить столбец
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="w-10 border border-border p-1" scope="col">
                <span className="sr-only">Действия со строками</span>
              </th>
              {Array.from({ length: cols }, (_, column) => (
                <th
                  key={column}
                  className="min-w-36 border border-border p-1"
                  scope="col"
                >
                  <div className="flex items-center gap-1">
                    <Input
                      value={data[column] ?? ""}
                      onChange={(event) =>
                        updateCell(0, column, event.target.value)
                      }
                      aria-label={`Заголовок столбца ${column + 1}`}
                      placeholder={`Столбец ${column + 1}`}
                      className="h-8 border-0 bg-transparent text-xs font-semibold"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeColumn(column)}
                      disabled={cols <= MIN_SIZE}
                      aria-label={`Удалить столбец ${column + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows - 1 }, (_, bodyIndex) => {
              const row = bodyIndex + 1;
              return (
                <tr key={row}>
                  <th className="border border-border p-1" scope="row">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => removeRow(row)}
                      disabled={rows <= MIN_SIZE}
                      aria-label={`Удалить строку ${row}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </th>
                  {Array.from({ length: cols }, (_, column) => (
                    <td key={column} className="border border-border p-0">
                      <Input
                        value={data[row * cols + column] ?? ""}
                        onChange={(event) =>
                          updateCell(row, column, event.target.value)
                        }
                        aria-label={`Ячейка ${row + 1}, ${column + 1}`}
                        className="h-9 rounded-none border-0 bg-transparent text-xs"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Первая строка используется как заголовок таблицы. Ниже показан
        предварительный результат.
      </p>
    </div>
  );
}
