import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_URL = "https://log-pipeline.onrender.com";

function App() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [topEndpoints, setTopEndpoints] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  // =========================
  // FETCH DATA
  // =========================
  useEffect(() => {
    fetch(`${API_URL}/logs/stats/summary`)
      .then((res) => res.json())
      .then(setSummary);

    fetch(`${API_URL}/logs/recent`)
      .then((res) => res.json())
      .then(setLogs);

    fetch(`${API_URL}/logs/stats/top-endpoints`)
      .then((res) => res.json())
      .then(setTopEndpoints);
  }, []);

  // =========================
  // FILTROS
  // =========================
  const filteredLogs = logs.filter((log) => {
    return (
      log.endpoint.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter ? log.status_code >= statusFilter : true) &&
      (methodFilter ? log.method === methodFilter : true)
    );
  });

  // =========================
  // DATA CHART
  // =========================
  const chartData = logs.slice(0, 20).map((log, i) => ({
    name: i,
    errors: log.status_code >= 400 ? 1 : 0,
    success: log.status_code < 400 ? 1 : 0,
  }));

  const pieData = summary
    ? [
        { name: "Correctos", value: summary.success },
        { name: "Errores", value: summary.errors },
      ]
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <h1 className="text-4xl font-semibold text-center mb-2">
        📊 Log Dashboard
      </h1>
      <p className="text-center text-sm text-gray-500 mb-6">
        🟢 LIVE · actualización automática
      </p>

      {/* KPI CARDS */}
      {summary && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          <BigCard title="Total" value={summary.total} />
          <BigCard
            title="Errores"
            value={summary.errors}
            color="text-red-500"
          />
          <BigCard
            title="Correctos"
            value={summary.success}
            color="text-green-600"
          />
        </div>
      )}

      {/* CHART + PIE */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* LINE CHART */}
        <div className="col-span-2 bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2 text-lg">
            📈 Actividad en tiempo real
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Últimos eventos procesados
          </p>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="success" stroke="#16a34a" />
              <Line type="monotone" dataKey="errors" stroke="#dc2626" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART */}
        <div className="bg-white shadow rounded p-4 flex flex-col items-center justify-center">
          <PieChart width={250} height={250}>
            <Pie
              data={pieData}
              innerRadius={70}
              outerRadius={100}
              dataKey="value"
            >
              <Cell fill="#16a34a" />
              <Cell fill="#dc2626" />
            </Pie>
          </PieChart>

          {/* TEXTO CENTRO */}
          {summary && (
            <div className="text-center -mt-28">
              <p className="text-green-600 font-bold text-lg">
                ✔ {summary.success}
              </p>
              <p className="text-red-500 font-bold text-lg">
                ✖ {summary.errors}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-3 mb-4">
        <input
          placeholder="Buscar endpoint..."
          className="border p-2 rounded w-64"
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border p-2 rounded"
          onChange={(e) => setStatusFilter(Number(e.target.value))}
        >
          <option value="">Status</option>
          <option value="400">Errores (400+)</option>
          <option value="200">Correctos (200)</option>
        </select>

        <select
          className="border p-2 rounded"
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="">Método</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
      </div>

      {/* TABLE + SIDEBAR */}
      <div className="grid grid-cols-4 gap-6">
        {/* SIDEBAR */}
        <div className="col-span-1 bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Top Endpoints</h2>
          <ul className="space-y-1 text-sm">
            {topEndpoints.map((item, i) => (
              <li key={i}>
                {item.endpoint} → {item.count}
              </li>
            ))}
          </ul>
        </div>

        {/* TABLE */}
        <div className="col-span-3 bg-white shadow rounded p-4 overflow-auto max-h-[500px]">
          <h2 className="font-semibold mb-2">
            Logs ({filteredLogs.length})
          </h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Endpoint</th>
                <th>Status</th>
                <th>Método</th>
                <th>Tiempo</th>
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
                  <td>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================
// COMPONENTES
// =========================
function BigCard({ title, value, color = "text-gray-900" }) {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 text-center hover:scale-105 transition">
      <p className="text-sm text-gray-500 mb-2">{title}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default App;
