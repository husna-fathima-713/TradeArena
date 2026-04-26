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

// ✅ CENTRALIZED BACKEND URL
const API_URL = "https://tradearena-1.onrender.com";

function App() {
  const [stocks, setStocks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [valueHistory, setValueHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userId")
  );

  const lockRef = useRef(false);

  const getUserId = () => localStorage.getItem("userId");

  // ---------------- DASHBOARD ----------------
  const fetchDashboard = async () => {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    console.log("NO USER ID");
    return;
  }

  try {
    const res = await fetch(
      `https://tradearena-1.onrender.com/dashboard?userId=${userId}`
    );

    const data = await res.json();

    console.log("DASHBOARD DATA:", data);

    setDashboard(data);
  } catch (err) {
    console.log(err);
    setError("Dashboard failed");
  }
};

  // ---------------- LEADERBOARD ----------------
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/leaderboard`);

      if (!res.ok) {
        setError("Leaderboard API failed");
        return;
      }

      const data = await res.json();
      setLeaderboard(data);
    } catch {
      setError("Server not reachable");
    }
  };

  // ---------------- PRICES ----------------
  const fetchPrices = async () => {
    try {
      const res = await fetch(`${API_URL}/prices`);
      const data = await res.json();

      const formatted = Object.entries(data).map(([name, price]) => ({
        name,
        price
      }));

      setStocks(formatted);
    } catch {
      setError("Price fetch failed");
    }
  };

  // ---------------- HISTORY ----------------
  const fetchValueHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/history/value`);
      const data = await res.json();
      setValueHistory(data);
    } catch {
      setError("History load failed");
    }
  };

  // ---------------- INITIAL LOAD ----------------
  const userId = localStorage.getItem("userId");

useEffect(() => {
  if (!userId) return;

  fetchDashboard();
  fetchValueHistory();
  fetchLeaderboard();
  fetchPrices();

  const interval = setInterval(() => {
    fetchDashboard();
    fetchValueHistory();
    fetchLeaderboard();
  }, 5000);

  return () => clearInterval(interval);
}, [userId]);

  // ---------------- TRADE ----------------
  const trade = async (type, stock) => {
    if (lockRef.current) return;

    const userId = getUserId();
    if (!userId) return;

    lockRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          stock,
          quantity,
          userId
        })
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        await fetchDashboard();
      }

    } catch {
      setError(`${type} failed`);
    }

    lockRef.current = false;
    setLoading(false);
  };

  const handleBuy = (stock) => trade("buy", stock);
  const handleSell = (stock) => trade("sell", stock);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setError(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    setDashboard(null);
  };

  // ---------------- CLEAR HISTORY ----------------
  const clearHistory = async () => {
    await fetch(`${API_URL}/history`, {
      method: "DELETE"
    });
    fetchDashboard();
  };

  // ---------------- UI ----------------
  return isLoggedIn ? (
    <div className="container">
      <h1>TradeArena</h1>

      <button onClick={handleLogout}>Logout</button>

      {error && <p className="red">{error}</p>}

      {/* UI remains same */}
    </div>
  ) : (
    <Login onLogin={handleLogin} />
  );
}

export default App;