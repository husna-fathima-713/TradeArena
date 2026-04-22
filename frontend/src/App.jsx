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

function App() {
  const [stocks, setStocks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [valueHistory, setValueHistory] = useState([]);

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userId")
  );

  const lockRef = useRef(false);

  // ---------------- USER INIT ----------------
 const getUserId = () => {
  return localStorage.getItem("userId");
};
  // ---------------- FETCH DASHBOARD ----------------
  const fetchDashboard = async () => {
  const userId = getUserId();
  if (!userId) return;

  try {
    const res = await fetch(
      `http://localhost:5000/dashboard?userId=${userId}`
    );

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Dashboard failed");
      return;
    }

    setDashboard(data);
  } catch {
    setError("Server not reachable");
  }
};

  // ---------------- FETCH PRICES ----------------
  const fetchPrices = async () => {
    try {
      const res = await fetch("http://localhost:5000/prices");
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

  // ---------------- FETCH HISTORY ----------------
  const fetchValueHistory = async () => {
    try {
      const res = await fetch("http://localhost:5000/history/value");
      const data = await res.json();
      setValueHistory(data);
    } catch {
      setError("History load failed");
    }
  };

  // ---------------- INITIAL LOAD ----------------
  useEffect(() => {
    fetchDashboard();
    fetchPrices();
    fetchValueHistory();

    const interval = setInterval(() => {
      fetchDashboard();
      fetchPrices();
      fetchValueHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ---------------- TRADE ----------------
  const trade = async (type, stock) => {
    if (lockRef.current) return;

    lockRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock,
          quantity,
          userId: getUserId()
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
  };
  // ---------------- CLEAR HISTORY ----------------
  const clearHistory = async () => {
    await fetch("http://localhost:5000/history", {
      method: "DELETE"
    });
    fetchDashboard();
  };

  // ---------------- UI ----------------
  return isLoggedIn ? (
  <div className="container">
    <h1>TradeArena</h1>

    <button
      onClick={() => {
      localStorage.removeItem("userId");
      window.location.reload();
    }}
    >
      Logout
    </button>

    {error && <p className="red">{error}</p>}

    <div className="grid">
      <div className="card">
        <h2>Account</h2>
        {dashboard ? (
          <>
            <p>Balance: ₹{dashboard.balance.toFixed(2)}</p>
            <p>Holdings: ₹{dashboard.holdingsValue.toFixed(2)}</p>
            <h3>Total: ₹{dashboard.totalValue.toFixed(2)}</h3>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      <div className="card">
        <h2>Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={valueHistory}>
            <XAxis dataKey="timestamp" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="totalValue" stroke="#22c55e" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="bottom-grid">
      <div className="card">
        <h2>Trade</h2>

        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        {stocks.map((s) => (
          <div key={s.name} className="trade-row">
            <span>{s.name}: ₹{s.price}</span>

            <div>
              <button className="buy" onClick={() => handleBuy(s.name)}>
                Buy
              </button>
              <button className="sell" onClick={() => handleSell(s.name)}>
                Sell
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Portfolio</h2>
        {dashboard?.portfolio &&
          Object.entries(dashboard.portfolio).map(([s, d]) => (
            <p key={s}>
              {s}: {d.quantity} @ ₹{d.avgPrice.toFixed(2)}
            </p>
          ))}
      </div>

      <div className="card">
        <h2>PnL</h2>
        {dashboard?.pnl &&
          Object.entries(dashboard.pnl).map(([s, d]) => (
            <p key={s}>
              {s}:{" "}
              <span className={d.pnl >= 0 ? "green" : "red"}>
                ₹{d.pnl}
              </span>
            </p>
          ))}
      </div>

      <div className="card">
        <h2>
          Transactions
          <button onClick={clearHistory}>Clear</button>
        </h2>

        <div className="scroll">
          {dashboard?.transactions?.map((t, i) => (
            <p key={i}>
              [{t.type}] {t.stock} x{t.quantity}
            </p>
          ))}
        </div>
      </div>
    </div>
  </div>
) : (
  <Login onLogin={handleLogin} />
);
}

export default App;