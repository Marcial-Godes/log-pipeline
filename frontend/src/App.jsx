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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const [lastUpdate, setLastUpdate] = useState(null);

  // =========================
  // FETCH DATA
  // =========================
  const fetchData = async () => {
    try {
      const [summaryRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/logs/stats/summary`),
        fetch(`${API_URL}/logs/recent`),
      ]);

      const summaryData = await summaryRes.json();
      const logsData = await logsRes.json();

      setSummary(summaryData);
      setLogs(logsData);

      // 🔥 IMPORTANTE: trigger de alertas
      await fetch(`${API_URL}/logs/stats/realtime-check`);

      setLastUpdate(new Date());
    } catch (error) {
      console.error("🔥 ERROR FETCH:", error);
    }
  };

  // =========================
  // WEBSOCKET
  // =========================
  useEffect(() => {
    const ws = new WebSocket("wss://log-pipeline.onrender.com/ws");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "error") {
        setAlerts((prev) => [
          { id: Date.now(), message: data.message },
          ...prev.slice(0, 4),
        ]);
      }
    };

    ws.onerror = () => console.log("WS error");
    ws.onclose = () => console.log("WS closed");

    return () => ws.close();
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!summary) {
    return <div className="p-6 text-center">Cargando...</div>;
  }

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
      <h1 className="text-4xl font-semibold text-center mb-2">
        📊 Log Dashboard
      </h1>

      {/* ALERTAS */}
      <div className="space-y-2 mb-4">
        {alerts.map((a) => (
          <div key={a.id} className="bg-red-500 text-white p-2 rounded shadow">
            🚨 {a.message}
          </div>
        ))}
      </div>

      {/* LIVE */}
      <div className="text-center text-sm text-gray-500 mb-6">
        🟢 LIVE · {lastUpdate?.toLocaleTimeString()}
      </div>

      {/* SUMMARY */}
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
            {((summary.errors / summary.total) * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="col-span-3 bg-white shadow rounded p-4">
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
          className="border p-2"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          onClick={() => {
            setSearch("");
            setStatusFilter("");
            setMethodFilter("");
          }}
          className="bg-black text-white px-4"
        >
          Reset
        </button>
      </div>

      {/* TABLA */}
      <table className="w-full text-sm bg-white shadow rounded">
        <tbody>
          {filteredLogs.map((log, i) => (
            <tr key={i} className="border-b">
              <td>{log.endpoint}</td>
              <td>{log.status_code}</td>
              <td>{log.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;