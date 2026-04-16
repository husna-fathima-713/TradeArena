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
          </div>
        ))
      )}
    </div>
  );
}

export default App;