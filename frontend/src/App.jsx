import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const API_URL = "https://log-pipeline.onrender.com";

const COLORS = ["#22c55e", "#ef4444"]; // verde / rojo

function App() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [topEndpoints, setTopEndpoints] = useState([]);

  const [methodFilter, setMethodFilter] = useState("ALL");
  const [endpointFilter, setEndpointFilter] = useState("ALL");

  // 🔄 fetch data
  const fetchData = () => {
    fetch(`${API_URL}/logs/stats/summary`)
      .then((res) => res.json())
      .then(setSummary);

    fetch(`${API_URL}/logs/recent`)
      .then((res) => res.json())
      .then(setLogs);

    fetch(`${API_URL}/logs/stats/top-endpoints`)
      .then((res) => res.json())
      .then(setTopEndpoints);
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 5000); // 🔥 auto refresh
    return () => clearInterval(interval);
  }, []);

  // 🎛️ filtros
  const filteredLogs = logs.filter((log) => {
    return (
      (methodFilter === "ALL" || log.method === methodFilter) &&
      (endpointFilter === "ALL" || log.endpoint === endpointFilter)
    );
  });

  const uniqueEndpoints = [...new Set(logs.map((l) => l.endpoint))];
  const uniqueMethods = [...new Set(logs.map((l) => l.method))];

  // 📊 gráfico
  const chartData = summary
    ? [
        { name: "Correctos", value: summary.success },
        { name: "Errores", value: summary.errors },
      ]
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-4xl font-semibold text-center mb-6">
        📊 Log Dashboard
      </h1>

      {/* SUMMARY + CHART */}
      {summary && (
        <div className="flex gap-6 justify-center mb-8">
          <div className="flex gap-4">
            <div className="bg-white shadow p-4 rounded text-center w-24">
              <p>Total</p>
              <p className="text-xl font-bold">{summary.total}</p>
            </div>
            <div className="bg-white shadow p-4 rounded text-center w-24">
              <p>Errores</p>
              <p className="text-xl font-bold text-red-500">
                {summary.errors}
              </p>
            </div>
            <div className="bg-white shadow p-4 rounded text-center w-24">
              <p>Correctos</p>
              <p className="text-xl font-bold text-green-600">
                {summary.success}
              </p>
            </div>
          </div>

          {/* 📊 PIE CHART */}
          <div className="bg-white shadow p-4 rounded">
            <PieChart width={200} height={200}>
              <Pie
                data={chartData}
                dataKey="value"
                label={({ value }) => value} // 🔥 números visibles SIEMPRE
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* LEFT */}
        <div className="col-span-1 bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Top Endpoints</h2>
          <ul className="space-y-1">
            {topEndpoints.map((item, i) => (
              <li key={i}>
                {item.endpoint} → {item.count}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT */}
        <div className="col-span-3 bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-4">Logs</h2>

          {/* 🎛️ FILTROS */}
          <div className="flex gap-2 mb-4">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="border p-1"
            >
              <option value="ALL">Todos métodos</option>
              {uniqueMethods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>

            <select
              value={endpointFilter}
              onChange={(e) => setEndpointFilter(e.target.value)}
              className="border p-1"
            >
              <option value="ALL">Todos endpoints</option>
              {uniqueEndpoints.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* TABLE */}
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => (
                  <tr key={i} className="border-b">
                    <td>{log.endpoint}</td>
                    <td
                      className={
                        log.status_code >= 400
                          ? "text-red-500"
                          : "text-green-600"
                      }
                    >
                      {log.status_code}
                    </td>
                    <td>{log.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;