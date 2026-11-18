import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TableBlockEditor from "./TableBlockEditor";

function Harness({
  initialContent,
  onChange,
}: {
  initialContent: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const [content, setContent] = useState(initialContent);
  return (
    <TableBlockEditor
      content={content}
      onChange={(next) => {
        onChange(next);
        setContent(next);
      }}
    />
  );
}

describe("TableBlockEditor", () => {
  afterEach(cleanup);

  it("edits header and cells, and adds or removes rows and columns", () => {
    const onChange = vi.fn();
    render(
      <Harness
        initialContent={{ rows: 2, cols: 2, data: ["Name", "Value", "A", "1"] }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Заголовок столбца 1"), {
      target: { value: "Показатель" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      rows: 2,
      cols: 2,
      data: ["Показатель", "Value", "A", "1"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Добавить строку" }));
    expect(onChange).toHaveBeenLastCalledWith({
      rows: 3,
      cols: 2,
      data: ["Показатель", "Value", "A", "1", "", ""],
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить столбец" }));
    expect(onChange).toHaveBeenLastCalledWith({
      rows: 3,
      cols: 3,
      data: ["Показатель", "Value", "", "A", "1", "", "", "", ""],
    });
    fireEvent.click(screen.getByRole("button", { name: "Удалить строку 1" }));
    expect(onChange).toHaveBeenLastCalledWith({
      rows: 2,
      cols: 3,
      data: ["Показатель", "Value", "", "", "", ""],
    });
    fireEvent.click(screen.getByRole("button", { name: "Удалить столбец 2" }));
    expect(onChange).toHaveBeenLastCalledWith({
      rows: 2,
      cols: 2,
      data: ["Показатель", "", "", ""],
    });
  });
});
