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
} from "recharts";

const API_URL = "https://log-pipeline.onrender.com";

function App() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [topEndpoints, setTopEndpoints] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const [lastUpdate, setLastUpdate] = useState(null);

  // 🔥 ALERTAS PRO
  const [alerts, setAlerts] = useState([]);

  const fetchData = async () => {
    try {
      const [summaryRes, logsRes, topRes] = await Promise.all([
        fetch(`${API_URL}/logs/stats/summary`),
        fetch(`${API_URL}/logs/recent`),
        fetch(`${API_URL}/logs/stats/top-endpoints`),
      ]);

      if (!summaryRes.ok || !logsRes.ok || !topRes.ok) {
        throw new Error("API no responde");
      }

      const summaryData = await summaryRes.json();
      const logsData = await logsRes.json();
      const topData = await topRes.json();

      setSummary(summaryData);
      setLogs(logsData);
      setTopEndpoints(topData);
      setLastUpdate(new Date());

      // 🔥 GENERADOR DE ALERTAS
      const errorRate =
        (summaryData.errors / summaryData.total) * 100;

      let newAlert = null;

      if (errorRate > 50) {
        newAlert = {
          id: Date.now(),
          type: "critical",
          message: `CRITICAL: ${errorRate.toFixed(1)}% errores`,
          time: new Date(),
        };
      } else if (errorRate > 25) {
        newAlert = {
          id: Date.now(),
          type: "warning",
          message: `WARNING: ${errorRate.toFixed(1)}% errores`,
          time: new Date(),
        };
      }

      if (newAlert) {
        setAlerts((prev) => [newAlert, ...prev].slice(0, 5));
      }
    } catch (error) {
      console.error("ERROR FETCH:", error);

      const errorAlert = {
        id: Date.now(),
        type: "critical",
        message: "Servidor no disponible",
        time: new Date(),
      };

      setAlerts((prev) => [errorAlert, ...prev].slice(0, 5));
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const pieData = summary
    ? [
        { name: "Correctos", value: summary.success },
        { name: "Errores", value: summary.errors },
      ]
    : [];

  const activityData = logs.slice(0, 20).map((log, i) => ({
    name: i,
    success: log.status_code < 400 ? 1 : 0,
    error: log.status_code >= 400 ? 1 : 0,
  }));

  const filteredLogs = logs.filter((log) => {
    return (
      log.endpoint.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter ? log.status_code.toString() === statusFilter : true) &&
      (methodFilter ? log.method === methodFilter : true)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* HEADER */}
      <h1 className="text-4xl font-semibold text-center mb-1">
        📊 Log Dashboard
      </h1>

      {/* LIVE */}
      <div className="flex justify-center items-center gap-2 text-sm text-gray-500 mb-4">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>

        <span className="font-medium text-green-600">LIVE</span>
        <span>·</span>
        <span className="font-mono">
          {lastUpdate ? lastUpdate.toLocaleTimeString() : "--:--:--"}
        </span>
      </div>

      {/* 🔥 ALERTAS PANEL */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              onClick={() => setStatusFilter("400")}
              className={`p-3 rounded cursor-pointer text-sm flex justify-between ${
                a.type === "critical"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              <span>{a.message}</span>
              <span className="text-xs">
                {a.time.toLocaleTimeString()}
              </span>
            </div>
          ))}

          <button
            onClick={() => setAlerts([])}
            className="text-xs text-gray-500 underline"
          >
            Limpiar alertas
          </button>
        </div>
      )}

      {/* SUMMARY */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow p-4 rounded text-center">
            <p>Total</p>
            <p className="text-xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-white shadow p-4 rounded text-center">
            <p>Errores</p>
            <p className="text-xl font-bold text-red-500">
              {summary.errors}
            </p>
          </div>
          <div className="bg-white shadow p-4 rounded text-center">
            <p>Correctos</p>
            <p className="text-xl font-bold text-green-600">
              {summary.success}
            </p>
          </div>
          <div className="bg-white shadow p-4 rounded text-center">
            <p>% Error</p>
            <p className="text-xl font-bold text-orange-500">
              {(
                (summary.errors / summary.total) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
        </div>
      )}

      {/* GRÁFICOS */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="col-span-3 bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">📈 Actividad</h2>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={activityData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="success" stroke="#16a34a" />
              <Line type="monotone" dataKey="error" stroke="#dc2626" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* DONUT */}
        <div className="col-span-1 bg-white shadow rounded p-4 flex items-center justify-center">
          <div className="relative">
            <PieChart width={220} height={220}>
              <Pie
                data={pieData}
                innerRadius={70}
                outerRadius={100}
                dataKey="value"
              />
            </PieChart>

            {summary && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-sm">
                <span className="text-gray-400">Logs</span>
                <span className="text-xl font-bold">
                  {summary.total}
                </span>
                <div className="flex gap-2 mt-1">
                  <span className="text-green-600 text-xs">
                    {summary.success}
                  </span>
                  <span className="text-red-500 text-xs">
                    {summary.errors}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar endpoint..."
          className="border p-2 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border p-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Status</option>
          <option value="200">200</option>
          <option value="400">400</option>
          <option value="500">500</option>
        </select>

        <select
          className="border p-2 rounded"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="">Método</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>

        <button
          onClick={() => {
            setSearch("");
            setStatusFilter("");
            setMethodFilter("");
          }}
          className="bg-black text-white px-4 rounded"
        >
          Reset
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white shadow rounded p-4 overflow-auto max-h-[400px]">
        <h2 className="font-semibold mb-2">
          Logs ({filteredLogs.length})
        </h2>

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
  );
}

export default App;