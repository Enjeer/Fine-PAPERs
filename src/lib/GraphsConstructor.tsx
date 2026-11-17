import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartPoint {
  x: string;
  y: number;
}

export interface dataEntry {
  id: string;
  name: string;
  data: ChartPoint[];
}

export interface GraphProps {
  id: string;
  type: "linear" | "area" | "bar" | "scatter" | "pie";
  dataEntries: dataEntry[];
  xAxis?: string;
  yAxis?: string;
}

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2"];

export default function GraphsConstructor({
  type,
  dataEntries,
  xAxis,
  yAxis,
}: GraphProps) {
  const categories = Array.from(
    new Set(dataEntries.flatMap((entry) => entry.data.map((point) => point.x))),
  );
  const rows = categories.map((name) => {
    const row: Record<string, string | number> = { name };
    for (const entry of dataEntries) {
      const point = entry.data.find((item) => item.x === name);
      if (point) row[entry.id] = point.y;
    }
    return row;
  });

  if (!dataEntries.length || !categories.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
        Добавьте точки данных для построения графика
      </div>
    );
  }

  if (type === "pie") {
    const pieData = dataEntries[0].data.map((point) => ({
      name: point.x,
      value: point.y,
    }));
    return (
      <div className="h-64 w-full" role="img" aria-label="Круговая диаграмма">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius="75%" label>
              {pieData.map((point, index) => (
                <Cell key={point.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "scatter") {
    const scatterData = dataEntries.flatMap((entry) =>
      entry.data.map((point) => ({
        x: Number(point.x),
        y: point.y,
        name: entry.name,
      })),
    );
    return (
      <div className="h-64 w-full" role="img" aria-label="Точечная диаграмма">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={xAxis || "X"} />
            <YAxis type="number" dataKey="y" name={yAxis || "Y"} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={scatterData} fill={COLORS[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full" role="img" aria-label="График данных">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataEntries.map((entry, index) => (
              <Bar
                key={entry.id}
                dataKey={entry.id}
                name={entry.name}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        ) : type === "area" ? (
          <AreaChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataEntries.map((entry, index) => (
              <Area
                key={entry.id}
                type="monotone"
                dataKey={entry.id}
                name={entry.name}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.2}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" label={{ value: xAxis, position: "insideBottom", offset: -3 }} />
            <YAxis label={{ value: yAxis, angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {dataEntries.map((entry, index) => (
              <Line
                key={entry.id}
                type="monotone"
                dataKey={entry.id}
                name={entry.name}
                stroke={COLORS[index % COLORS.length]}
                connectNulls
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
