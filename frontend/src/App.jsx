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
const WS_URL = "wss://log-pipeline.onrender.com/ws";

function App() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const MAX_ALERTS = 3;

  const addAlert = (message) => {
    const id = Date.now();

    setAlerts((prev) => [{ id, message }, ...prev].slice(0, MAX_ALERTS));

    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 4000);
  };

  // 🔥 FETCH INICIAL
  const fetchInitialData = async () => {
    try {
      const [summaryRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/logs/stats/summary`),
        fetch(`${API_URL}/logs/recent`),
      ]);

      const summaryData = await summaryRes.json();
      const logsData = await logsRes.json();

      setSummary(summaryData);
      setLogs(logsData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("ERROR INIT:", err);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // 🔥 WEBSOCKET REAL
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("🟢 WS conectado");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "new_log") {
        const log = msg.data;

        setLogs((prev) => [log, ...prev.slice(0, 49)]);

        setSummary((prev) => {
          if (!prev) return prev;

          const isError = log.status_code >= 400;

          return {
            total: prev.total + 1,
            success: isError ? prev.success : prev.success + 1,
            errors: isError ? prev.errors + 1 : prev.errors,
          };
        });

        if (log.status_code >= 400) {
          addAlert(`🚨 Error ${log.status_code} en ${log.endpoint}`);
        }

        setLastUpdate(new Date());
      }
    };

    ws.onerror = (e) => {
      console.error("WS ERROR", e);
    };

    ws.onclose = () => {
      console.log("🔴 WS cerrado");
    };

    return () => ws.close();
  }, []);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">

      <h1 className="text-4xl text-center mb-2">
        📊 Log Dashboard
      </h1>

      {/* ALERTAS */}
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

    </div>
  );
}

export default App;