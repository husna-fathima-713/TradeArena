import Login from "./Login";
import { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import "./App.css";

const API_URL = "https://tradearena-1.onrender.com";

function App() {
  const [stocks, setStocks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [valueHistory, setValueHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userId")
  );

  const lockRef = useRef(false);

  const getUserId = () => localStorage.getItem("userId");

  // ---------------- DASHBOARD ----------------
  const fetchDashboard = async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const res = await fetch(`${API_URL}/dashboard?userId=${userId}`);
      const data = await res.json();

      console.log("DASHBOARD:", data);

      setDashboard(data);
    } catch {
      setError("Dashboard failed");
    }
  };

  // ---------------- OTHER FETCHES ----------------
  const fetchLeaderboard = async () => {
    const res = await fetch(`${API_URL}/leaderboard`);
    const data = await res.json();
    setLeaderboard(data);
  };

  const fetchPrices = async () => {
    const res = await fetch(`${API_URL}/prices`);
    const data = await res.json();

    const formatted = Object.entries(data).map(([name, price]) => ({
      name,
      price
    }));

    setStocks(formatted);
  };

  const fetchValueHistory = async () => {
    const res = await fetch(`${API_URL}/history/value`);
    const data = await res.json();
    setValueHistory(data);
  };

  // ---------------- LOAD ----------------
  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    fetchDashboard();
    fetchPrices();
    fetchLeaderboard();
    fetchValueHistory();

    const interval = setInterval(() => {
      fetchDashboard();
      fetchLeaderboard();
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // ---------------- TRADE ----------------
  const trade = async (type, stock) => {
    if (lockRef.current) return;

    const userId = getUserId();
    if (!userId) return;

    lockRef.current = true;

    try {
      const res = await fetch(`${API_URL}/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ stock, quantity, userId })
      });

      const data = await res.json();

      if (!data.error) {
        fetchDashboard();
      }
    } catch {
      setError("Trade failed");
    }

    lockRef.current = false;
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    setDashboard(null);
  };

  // ---------------- UI ----------------
  return isLoggedIn ? (
    <div className="container">
      <h1>TradeArena</h1>

      <button onClick={handleLogout}>Logout</button>

      {error && <p className="red">{error}</p>}

      {/* ACCOUNT */}
      <div className="card">
        <h2>Account</h2>

        {dashboard ? (
          <>
            <p>Balance: ₹{dashboard?.balance?.toFixed(2)}</p>
            <p>Holdings: ₹{dashboard?.holdingsValue?.toFixed(2)}</p>
            <h3>Total: ₹{dashboard?.totalValue?.toFixed(2)}</h3>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      {/* GRAPH */}
      <div className="card">
        <h2>Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={valueHistory}>
            <XAxis dataKey="timestamp" hide />
            <YAxis />
            <Tooltip />
            <Line dataKey="totalValue" stroke="#22c55e" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* TRADE */}
      <div className="card">
        <h2>Trade</h2>

        <input
          type="number"
          value={quantity}
          min="1"
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        {stocks.map((s) => (
          <div key={s.name}>
            {s.name} ₹{s.price}
            <button onClick={() => trade("buy", s.name)}>Buy</button>
            <button onClick={() => trade("sell", s.name)}>Sell</button>
          </div>
        ))}
      </div>

      {/* PORTFOLIO */}
      <div className="card">
        <h2>Portfolio</h2>
        {Object.entries(dashboard?.portfolio || {}).map(([s, d]) => (
          <p key={s}>
            {s}: {d.quantity} @ ₹{d.avgPrice.toFixed(2)}
          </p>
        ))}
      </div>

      {/* PNL */}
      <div className="card">
        <h2>PnL</h2>
        {Object.entries(dashboard?.pnl || {}).map(([s, d]) => (
          <p key={s}>
            {s}: ₹{d.pnl}
          </p>
        ))}
      </div>

      {/* LEADERBOARD */}
      <div className="card">
        <h2>Leaderboard</h2>
        {leaderboard.map((u, i) => (
          <p key={i}>
            #{i + 1} {u.username} → ₹{u.totalValue.toFixed(2)}
          </p>
        ))}
      </div>
    </div>
  ) : (
    <Login onLogin={handleLogin} />
  );
}

export default App;