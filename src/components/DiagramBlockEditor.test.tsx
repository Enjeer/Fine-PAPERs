import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DiagramBlockEditor from "./DiagramBlockEditor";

function Harness({ onChange }: { onChange: (content: Record<string, unknown>) => void }) {
  const [content, setContent] = useState<Record<string, unknown>>({
    title: "Flow",
    diagramType: "flowchart",
    nodes: [],
    edges: [],
  });
  return (
    <DiagramBlockEditor
      content={content}
      onChange={(next) => {
        onChange(next);
        setContent(next);
      }}
    />
  );
}

describe("DiagramBlockEditor", () => {
  afterEach(cleanup);

  it("creates visual nodes and editable links in the existing format", () => {
    let nodeId = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        nodeId += 1;
        return `node-${nodeId}`;
      },
    });
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Добавить элемент" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodes: [{ id: "node-node-1", label: "Элемент 1" }],
        edges: [],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Добавить элемент" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить связь" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        edges: [{ from: "node-node-1", to: "node-node-2", label: "" }],
      }),
    );
    expect(screen.getByLabelText("Название элемента 1")).toBeInTheDocument();
  });

  it("opens existing nodes and relationships for visual editing", () => {
    const onChange = vi.fn();
    function LegacyDiagram() {
      const [content, setContent] = useState<Record<string, unknown>>({
        title: "Existing process",
        diagramType: "sequence",
        nodes: [
          { id: "request", label: "Request" },
          { id: "response", label: "Response" },
        ],
        edges: [{ from: "request", to: "response", label: "Returns" }],
      });
      return (
        <DiagramBlockEditor
          content={content}
          onChange={(next) => {
            onChange(next);
            setContent(next);
          }}
        />
      );
    }

    render(<LegacyDiagram />);
    expect(screen.getByText("1. Request")).toBeInTheDocument();
    expect(screen.getByText("Returns: Response")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Название элемента 1"), {
      target: { value: "New request" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodes: [
          { id: "request", label: "New request" },
          { id: "response", label: "Response" },
        ],
        edges: [{ from: "request", to: "response", label: "Returns" }],
      }),
    );
  });
});
