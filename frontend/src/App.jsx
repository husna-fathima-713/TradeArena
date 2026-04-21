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
  const [loadingStock, setLoadingStock] = useState(null);
  const [error, setError] = useState(null);

  const lockRef = useRef(false);

  // ---------------- FETCH DASHBOARD ----------------
  const fetchDashboard = async () => {
    try {
      const res = await fetch("http://localhost:5000/dashboard");
      const data = await res.json();
      setDashboard(data);
    } catch {
      setError("Dashboard failed");
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

  // ---------------- FETCH VALUE HISTORY ----------------
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
    setLoadingStock(stock);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock, quantity })
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
    setLoadingStock(null);
  };

  const handleBuy = (stock) => trade("buy", stock);
  const handleSell = (stock) => trade("sell", stock);

  // ---------------- CLEAR HISTORY ----------------
  const clearHistory = async () => {
    await fetch("http://localhost:5000/history", {
      method: "DELETE"
    });
    fetchDashboard();
  };

  // ---------------- UI ----------------
  return (
    <div className="container">
      <h1>TradeArena</h1>

      {error && <p className="red">{error}</p>}

      {/* ACCOUNT */}
      <div className="card">
        <h2>Account</h2>
        {dashboard && (
          <div className="row">
            <div className="col">Balance: ₹{dashboard.balance.toFixed(2)}</div>
            <div className="col">Holdings: ₹{dashboard.holdingsValue.toFixed(2)}</div>
            <div className="col">
              <b>Total: ₹{dashboard.totalValue.toFixed(2)}</b>
            </div>
          </div>
        )}
      </div>

      {/* GRAPH */}
      <div className="card">
        <h2>Portfolio Growth</h2>
        {valueHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={valueHistory}>
              <XAxis dataKey="timestamp" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalValue" stroke="#00e676" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No data yet</p>
        )}
      </div>

      <div className="card">
  <h2>Trade</h2>

  <input
    type="number"
    min="1"
    value={quantity}
    onChange={(e) => setQuantity(Number(e.target.value))}
  />

  {stocks.map((s) => (
    <div
      key={s.name}
      className="row"
      style={{ alignItems: "center", marginBottom: "8px" }}
    >
      <div>
        {s.name}: ₹{Number(s.price).toFixed(2)}
      </div>

      <div>
        <button
          onClick={() => handleBuy(s.name)}
          disabled={loading}
        >
          {loadingStock === s.name ? "..." : "Buy"}
        </button>

        <button
          onClick={() => handleSell(s.name)}
          disabled={loading}
        >
          {loadingStock === s.name ? "..." : "Sell"}
        </button>
      </div>
    </div>
  ))}
</div>

      {/* PORTFOLIO */}
      <div className="card">
        <h2>Portfolio</h2>

        {dashboard?.portfolio &&
          Object.entries(dashboard.portfolio).map(([stock, data]) => (
            <div key={stock}>
              {stock} → {data.quantity} @ ₹{data.avgPrice.toFixed(2)}
            </div>
          ))}
      </div>

      {/* PNL */}
      <div className="card">
        <h2>PnL</h2>

        {dashboard?.pnl &&
          Object.entries(dashboard.pnl).map(([stock, data]) => (
            <div key={stock}>
              {stock} →{" "}
              <span className={data.pnl >= 0 ? "green" : "red"}>
                ₹{data.pnl}
              </span>
            </div>
          ))}
      </div>

      {/* TRANSACTIONS */}
      <div className="card">
        <h2>
          Transactions
          <button onClick={clearHistory}>Clear</button>
        </h2>

        <div style={{ maxHeight: 200, overflowY: "scroll" }}>
          {dashboard?.transactions?.map((t, i) => (
            <div key={i}>
              [{t.type}] {t.stock} x{t.quantity} @ ₹{t.price}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;