const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("TradeArena Backend Running");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

let user = {
  balance: 10000,
  portfolio: {}
};

app.get("/portfolio", (req, res) => {
  res.json(user);
});

app.post("/buy", (req, res) => {
  const { stock, quantity, price } = req.body;

  const cost = quantity * price;

  if (user.balance < cost) {
    return res.json({ message: "Insufficient balance" });
  }

  // Deduct balance
  user.balance -= cost;

  // Update portfolio
  if (!user.portfolio[stock]) {
    user.portfolio[stock] = 0;
  }

  user.portfolio[stock] += quantity;

  res.json({
    message: "Stock purchased",
    user
  });
});

app.post("/sell", (req, res) => {
  const { stock, quantity, price } = req.body;

  if (!user.portfolio[stock] || user.portfolio[stock] < quantity) {
    return res.json({ message: "Not enough stock to sell" });
  }

  // Add balance
  user.balance += quantity * price;

  // Reduce stock
  user.portfolio[stock] -= quantity;

  if (user.portfolio[stock] === 0) {
    delete user.portfolio[stock];
  }

  res.json({
    message: "Stock sold",
    user
  });
});