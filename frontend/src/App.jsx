import { useEffect, useState, useRef } from "react";
import { getPrices } from "./api";

function App() {
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStock, setLoadingStock] = useState(null);
  const [error, setError] = useState(null);

  // REAL ANTI-SPAM LOCK (IMPORTANT)
  const lockRef = useRef(false);

  // ---------------- FETCH ----------------

  useEffect(() => {
    const fetchData = async () => {
      const data = await getPrices();
      setStocks(Object.entries(data).map(([name, price]) => ({ name, price })));
    };

    fetchData();
    fetchPortfolio();
    fetchPnL();
    fetchTransactions();

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolio = async () => {
    const res = await fetch("http://localhost:5000/portfolio");
    setPortfolio(await res.json());
  };

  const fetchPnL = async () => {
    const res = await fetch("http://localhost:5000/pnl");
    setPnl(await res.json());
  };

  const fetchTransactions = async () => {
    const res = await fetch("http://localhost:5000/transactions");
    setTransactions(await res.json());
  };

  // ---------------- BUY ----------------

  const handleBuy = async (stock) => {
    if (lockRef.current) return;

    lockRef.current = true;
    setLoading(true);
    setLoadingStock(stock);
    setError(null);

    try {
      const res = await fetch("http://localhost:5000/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock, quantity })
      });

      const data = await res.json();
      if (data.error) setError(data.error);

      await Promise.all([
        fetchPortfolio(),
        fetchPnL(),
        fetchTransactions()
      ]);

    } catch {
      setError("Buy failed");
    }

    lockRef.current = false;
    setLoading(false);
    setLoadingStock(null);
  };

  // ---------------- SELL ----------------

  const handleSell = async (stock) => {
    if (lockRef.current) return;

    lockRef.current = true;
    setLoading(true);
    setLoadingStock(stock);
    setError(null);

    try {
      const res = await fetch("http://localhost:5000/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock, quantity })
      });

      const data = await res.json();
      if (data.error) setError(data.error);

      await Promise.all([
        fetchPortfolio(),
        fetchPnL(),
        fetchTransactions()
      ]);

    } catch {
      setError("Sell failed");
    }

    lockRef.current = false;
    setLoading(false);
    setLoadingStock(null);
  };

  // ---------------- UI ----------------

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>TradeArena</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />

      <h2>Live Prices</h2>

      {stocks.map((s) => (
        <div key={s.name} style={{ marginBottom: 10 }}>
          {s.name}: ₹{Number(s.price).toFixed(2)}

          <button onClick={() => handleBuy(s.name)} disabled={loading}>
            Buy
          </button>

          <button onClick={() => handleSell(s.name)} disabled={loading}>
            Sell
          </button>
        </div>
      ))}

      <h2>Portfolio</h2>
      {portfolio?.portfolio &&
        Object.entries(portfolio.portfolio).map(([k, v]) => (
          <div key={k}>
            {k} | Qty: {v.quantity} | Avg: ₹{v.avgPrice.toFixed(2)}
          </div>
        ))}

      <h2>PnL</h2>
      {pnl &&
        Object.entries(pnl).map(([k, v]) => (
          <div key={k}>
            {k} | PnL: ₹{v.pnl}
          </div>
        ))}

      <h2>Transactions</h2>
      {transactions.map((t, i) => (
        <div key={i}>
          {t.type} | {t.stock} | {t.quantity} | ₹{t.price}
        </div>
      ))}
    </div>
  );
}

export default App;