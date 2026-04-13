const Transaction = require("./models/Transaction");
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/tradearena")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));
  console.log("Trying to connect to MongoDB...");

const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("TradeArena Backend Running");
});

let user = {
  balance: 10000,
  portfolio: {}
};
let transactions = [];


app.get("/portfolio", (req, res) => {
  res.json(user);
});

app.post("/buy", async (req, res) => {
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
  transactions.push({
  type: "BUY",
  stock,
  quantity,
  price,
  timestamp: Date.now()
});

  res.json({
    message: "Stock purchased",
    user
  });
});

app.post("/sell", async (req, res) => {
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
 
  await Transaction.create({
  type: "SELL",
  stock,
  quantity,
  price,
  timestamp: Date.now()
});

console.log("SELL saved to DB");

  res.json({
    message: "Stock sold",
    user
  });
});

app.get("/transactions", async (req, res) => {
  const data = await Transaction.find();
  res.json(data);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});