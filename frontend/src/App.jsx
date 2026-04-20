import { useEffect, useState, useRef } from "react";

function App() {
  const [stocks, setStocks] = useState([]);
  const [dashboard, setDashboard] = useState(null);

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

  useEffect(() => {
    fetchDashboard();
    fetchPrices();

    const interval = setInterval(() => {
      fetchDashboard();
      fetchPrices();
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

      if (data.error) setError(data.error);

      await fetchDashboard();

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
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>TradeArena</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Account</h2>
      {dashboard && (
        <div>
          <p>Balance: ₹{dashboard.balance.toFixed(2)}</p>
          <p>Holdings: ₹{dashboard.holdingsValue.toFixed(2)}</p>
          <p><b>Total: ₹{dashboard.totalValue.toFixed(2)}</b></p>
        </div>
      )}

      <h2>Trade</h2>
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />

      {stocks.map((s) => (
        <div key={s.name}>
          {s.name}: ₹{Number(s.price).toFixed(2)}

          <button
            disabled={loading}
            onClick={() => handleBuy(s.name)}
          >
            {loadingStock === s.name ? "..." : "Buy"}
          </button>

          <button
            disabled={loading}
            onClick={() => handleSell(s.name)}
          >
            {loadingStock === s.name ? "..." : "Sell"}
          </button>
        </div>
      ))}

      <h2>Portfolio</h2>
      {dashboard?.portfolio &&
        Object.entries(dashboard.portfolio).map(([stock, data]) => (
          <div key={stock}>
            {stock} → {data.quantity} @ ₹{data.avgPrice.toFixed(2)}
          </div>
        ))}

      <h2>PnL</h2>
      {dashboard?.pnl &&
        Object.entries(dashboard.pnl).map(([stock, data]) => (
          <div key={stock}>
            {stock} → ₹{data.pnl}
          </div>
        ))}

      <h2>
        Transactions
        <button onClick={clearHistory} style={{ marginLeft: 10 }}>
          Clear
        </button>
      </h2>

      <div style={{
        maxHeight: 200,
        overflowY: "scroll",
        border: "1px solid #ccc",
        padding: 10
      }}>
        {dashboard?.transactions?.map((t, i) => (
          <div key={i}>
            [{t.type}] {t.stock} x{t.quantity} @ ₹{t.price}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;