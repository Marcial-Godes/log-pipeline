import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const API_URL = "https://log-pipeline.onrender.com";
const COLORS = ["#22c55e", "#ef4444"];

function App() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [topEndpoints, setTopEndpoints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [methodFilter, setMethodFilter] = useState("ALL");
  const [endpointFilter, setEndpointFilter] = useState("ALL");

  const fetchData = async () => {
    try {
      const [s, l, t] = await Promise.all([
        fetch(`${API_URL}/logs/stats/summary`).then((r) => r.json()),
        fetch(`${API_URL}/logs/recent`).then((r) => r.json()),
        fetch(`${API_URL}/logs/stats/top-endpoints`).then((r) => r.json()),
      ]);

      setSummary(s);
      setLogs(l);
      setTopEndpoints(t);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log) => {
    return (
      (methodFilter === "ALL" || log.method === methodFilter) &&
      (endpointFilter === "ALL" || log.endpoint === endpointFilter)
    );
  });

  const uniqueEndpoints = [...new Set(logs.map((l) => l.endpoint))];
  const uniqueMethods = [...new Set(logs.map((l) => l.method))];

  const chartData = summary
    ? [
        { name: "Correctos", value: summary.success },
        { name: "Errores", value: summary.errors },
      ]
    : [];

  // 🟡 LOADER
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        ⏳ Cargando dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-6 transition-all">
      <h1 className="text-4xl font-semibold text-center mb-2">
        📊 Log Dashboard
      </h1>

      {/* 🟢 LIVE */}
      <div className="text-center mb-6 text-sm text-gray-500">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          LIVE · última actualización: {lastUpdate}
        </span>
      </div>

      {/* SUMMARY + CHART */}
      {summary && (
        <div className="flex gap-6 justify-center mb-8 flex-wrap">
          <div className="flex gap-4">
            <Card title="Total" value={summary.total} />
            <Card title="Errores" value={summary.errors} color="text-red-500" />
            <Card title="Correctos" value={summary.success} color="text-green-600" />
          </div>

          <div className="bg-white shadow p-4 rounded hover:scale-105 transition">
            <PieChart width={220} height={220}>
              <Pie
                data={chartData}
                dataKey="value"
                label={({ value }) => value}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
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
              className="border p-1 rounded"
            >
              <option value="ALL">Métodos</option>
              {uniqueMethods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>

            <select
              value={endpointFilter}
              onChange={(e) => setEndpointFilter(e.target.value)}
              className="border p-1 rounded"
            >
              <option value="ALL">Endpoints</option>
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
                  <tr
                    key={i}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td>{log.endpoint}</td>
                    <td
                      className={
                        log.status_code >= 400
                          ? "text-red-500 font-semibold"
                          : "text-green-600 font-semibold"
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

// 🔹 COMPONENTE CARD
function Card({ title, value, color = "" }) {
  return (
    <div className="bg-white shadow p-4 rounded text-center w-28 hover:scale-105 transition">
      <p>{title}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default App;