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
  const [lastUpdate, setLastUpdate] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // 🔥 FETCH (fallback)
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
      setLastUpdate(new Date());
    } catch (err) {
      console.error("FETCH ERROR:", err);
    }
  };

  useEffect(() => {
    fetchData();

    let ws;

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("🟢 WS conectado");
        setWsConnected(true);
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

          setLastUpdate(new Date());
        }
      };

      ws.onerror = () => {
        console.log("⚠️ WS error → fallback polling");
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log("🔴 WS cerrado → fallback polling");
        setWsConnected(false);
      };
    } catch (e) {
      console.log("WS no disponible");
      setWsConnected(false);
    }

    // 🔥 FALLBACK polling si WS falla
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetchData();
      }
    }, 5000);

    return () => {
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [wsConnected]);

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

      <div className="text-center text-sm mb-6">
        {wsConnected ? "🟢 LIVE (WebSocket)" : "🟡 Polling mode"}
        {" · "}
        {lastUpdate?.toLocaleTimeString()}
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
      <div className="grid grid-cols-4 gap-6">

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