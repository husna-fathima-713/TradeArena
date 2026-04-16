import { useEffect, useState } from "react";
import { getPrices } from "./api";

function App() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await getPrices();

      console.log("RAW API:", data); // ✅ MOVE HERE

      const formatted = Object.entries(data).map(([name, price]) => ({
        name,
        price
      }));

      console.log("FORMATTED:", formatted);

      setStocks(formatted);
    } catch (err) {
      console.error("ERROR:", err);
    }
  };

  fetchData();

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
    console.log("BUY RESPONSE:", data);

  } catch (err) {
    console.error("BUY ERROR:", err);
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
          </div>
        ))
      )}
    </div>
  );
}

export default App;