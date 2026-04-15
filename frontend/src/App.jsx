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
  const [alerts, setAlerts] = useState([]);

  const [lastErrors, setLastErrors] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const MAX_ALERTS = 3;

  const addAlert = (message) => {
    const id = Date.now();

    setAlerts((prev) => {
      const updated = [{ id, message }, ...prev].slice(0, MAX_ALERTS);
      return updated;
    });

    // 🔥 auto eliminar después de 4s
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 4000);
  };

  const fetchData = async () => {
    try {
      const [summaryRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/logs/stats/summary`),
        fetch(`${API_URL}/logs/recent`),
      ]);

      const summaryData = await summaryRes.json();
      const logsData = await logsRes.json();

      setSummary(summaryData);
      setLogs(Array.isArray(logsData) ? logsData : []);

      // 🔥 ALERTAS INTELIGENTES
      if (lastErrors !== null && summaryData.errors > lastErrors) {
        const diff = summaryData.errors - lastErrors;
        addAlert(`🚨 +${diff} errores detectados`);
      }

      setLastErrors(summaryData.errors);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("ERROR:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [lastErrors]);

  if (!summary) return <div className="p-6">Cargando...</div>;

  const pieData = [
    { name: "Correctos", value: summary.success },
    { name: "Errores", value: summary.errors },
  ];

  const activityData = logs.slice(0, 20).map((log, i) => ({
    name: i,
    success: log.status_code < 400 ? 1 : 0,
    error: log.status_code >= 400 ? 1 : 0,
  }));

  const filteredLogs = logs.filter((log) => {
    return (
      (log.endpoint || "").toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter ? log.status_code.toString() === statusFilter : true) &&
      (methodFilter ? log.method === methodFilter : true)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* HEADER */}
      <h1 className="text-4xl text-center mb-2">
        📊 Log Dashboard
      </h1>

      {/* 🔥 ALERTAS */}
      <div className="space-y-2 mb-4">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="bg-red-600 text-white p-3 rounded shadow animate-pulse"
          >
            {a.message}
          </div>
        ))}
      </div>

      {/* LIVE */}
      <div className="text-center text-sm text-gray-500 mb-6">
        🟢 LIVE · {lastUpdate?.toLocaleTimeString()}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow p-4 text-center">
          <p>Total</p>
          <p className="text-xl font-bold">{summary.total}</p>
        </div>

        <div className="bg-white shadow p-4 text-center">
          <p>Errores</p>
          <p className="text-xl font-bold text-red-500">
            {summary.errors}
          </p>
        </div>

        <div className="bg-white shadow p-4 text-center">
          <p>Correctos</p>
          <p className="text-xl font-bold text-green-600">
            {summary.success}
          </p>
        </div>

        <div className="bg-white shadow p-4 text-center">
          <p>% Error</p>
          <p className="text-xl font-bold text-orange-500">
            {((summary.errors / summary.total) * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-4 gap-6 mb-6">

        {/* LINE */}
        <div className="col-span-3 bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">📈 Actividad</h2>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={activityData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line dataKey="success" stroke="#16a34a" />
              <Line dataKey="error" stroke="#dc2626" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* DONUT */}
        <div className="bg-white shadow rounded p-4 flex justify-center items-center">
          <PieChart width={200} height={200}>
            <Pie data={pieData} dataKey="value" innerRadius={60}>
              <Cell fill="#16a34a" />
              <Cell fill="#dc2626" />
            </Pie>
          </PieChart>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar..."
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