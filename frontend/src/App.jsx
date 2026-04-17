import { useEffect, useState } from "react";
import { getPrices } from "./api";

function App() {
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [transactions, setTransactions] = useState([]);
  useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await getPrices();

      const formatted = Object.entries(data).map(([name, price]) => ({
        name,
        price
      }));

      setStocks(formatted);
    } catch (err) {
      console.error("ERROR:", err);
    }
  };

  fetchData();
  fetchPortfolio();
  fetchPnL();
  fetchTransactions();

  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);

const handleBuy = async (stock) => {
  try {
    const res = await fetch("http://localhost:5000/buy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stock,
        quantity: 1
      })
    });

    const data = await res.json();
    await fetchPortfolio();
    await fetchPnL();
    await fetchTransactions();
    console.log("BUY RESPONSE:", data);

  } catch (err) {
    console.error("BUY ERROR:", err);
  }
};

const handleSell = async (stock) => {
  try {
    const res = await fetch("http://localhost:5000/sell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stock,
        quantity: 1
      })
    });

    const data = await res.json();
    console.log("SELL RESPONSE:", data);

    await fetchPortfolio();
    await fetchPnL();
    await fetchTransactions();
  } catch (err) {
    console.error("SELL ERROR:", err);
  }
};

const fetchPortfolio = async () => {
  const res = await fetch("http://localhost:5000/portfolio");
  const data = await res.json();
  console.log("PORTFOLIO:", data);
  setPortfolio(data);
};

const fetchPnL = async () => {
  try {
    const res = await fetch("http://localhost:5000/pnl");
    const data = await res.json();
    console.log("PNL:", data);
    setPnl(data);
  } catch (err) {
    console.error("PNL ERROR:", err);
  }
};

const fetchTransactions = async () => {
  try {
    const res = await fetch("http://localhost:5000/transactions");
    const data = await res.json();
    console.log("TRANSACTIONS:", data);
    setTransactions(data);
  } catch (err) {
    console.error("TX ERROR:", err);
  }
};
  return (
  <div>
    <h1>TradeArena Dashboard</h1>

    <h2>Live Prices</h2>
    {stocks.length === 0 ? (
      <p>No data</p>
    ) : (
      stocks.map((s, i) => (
        <div key={i}>
          {s.name}: ₹{s.price}
          <button onClick={() => handleBuy(s.name)}>Buy</button>
          <button onClick={() => handleSell(s.name)}>Sell</button>
        </div>
      ))
    )}

    <h2>Portfolio</h2>
    {!portfolio || !portfolio.portfolio ? (
      <p>No holdings</p>
    ) : (
      Object.entries(portfolio.portfolio).map(([stock, data]) => (
        <div key={stock}>
          {stock} - Qty: {data.quantity} - Avg: ₹{data.avgPrice.toFixed(2)}
        </div>
      ))
    )}

    <h2>PnL</h2>
    {!pnl || Object.keys(pnl).length === 0 ? (
      <p>No PnL data</p>
    ) : (
      Object.entries(pnl).map(([stock, data]) => (
        <div key={stock}>
          {stock} | Qty: {data.quantity} | Avg: ₹{data.avgPrice.toFixed(2)} | 
          Current: ₹{data.currentPrice} | 
          PnL: ₹{data.pnl}
        </div>
      ))
    )}
    
    <h2>Transactions</h2>
    {transactions.length === 0 ? (
      <p>No transactions</p>
    ) : (
      transactions.map((t, i) => (
        <div key={i}>
          {t.type} | {t.stock} | Qty: {t.quantity} | ₹{t.price}
        </div>
      ))
    )}
  </div>
);
}

export default App;