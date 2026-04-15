let prices = {
  AAPL: 100,
  TSLA: 200,
  GOOG: 150
};
setInterval(() => {
  for (let stock in prices) {
    let change = (Math.random() - 0.5) * 10; // -5 to +5
    prices[stock] = Math.max(1, prices[stock] + change);
  }

  console.log("Updated Prices:", prices);
}, 5000);


const User = require("./models/User");
const Transaction = require("./models/Transaction");
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/tradearena")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));
  console.log("Trying to connect to MongoDB...");

const express = require("express");
const app = express();

app.use(express.json());

app.get("/prices", (req, res) => {
  res.json(prices);
});

app.get("/", (req, res) => {
  res.send("TradeArena Backend Running");
});

app.get("/portfolio", async (req, res) => {
  const user = await User.findOne();
  
  res.json(user);
});

app.post("/buy", async (req, res) => {
  const { stock, quantity } = req.body;
  if (!stock || typeof quantity !== "number" || quantity <= 0) {
  return res.json({ message: "Invalid input" });
}
  const price = prices[stock];
  if (!price) {
  return res.json({ message: "Invalid stock symbol" });
}

  const cost = quantity * price;
  const user = await User.findOne();
 if (!user) {
  return res.json({ message: "User not found" });
}

if (!user.portfolio) {
  user.portfolio = {};
}

  if (user.balance < cost) {
    return res.json({ message: "Insufficient balance" });
  }

  // update balance
  user.balance -= cost;

  // update portfolio

 if (!user.portfolio[stock]) {
  user.portfolio[stock] = {
    quantity: 0,
    avgPrice: 0
  };
}

let existing = user.portfolio[stock];

// new average price formula
let totalCost = (existing.quantity * existing.avgPrice) + (quantity * price);
let totalQuantity = existing.quantity + quantity;

existing.quantity = totalQuantity;
existing.avgPrice = totalCost / totalQuantity;

  // mark + save AFTER changes
  user.markModified("portfolio");
  await user.save();

  // save transaction (DB, not array)
  await Transaction.create({
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
  const { stock, quantity } = req.body;
  if (!stock || typeof quantity !== "number" || quantity <= 0) {
  return res.json({ message: "Invalid input" });
}
  const price = prices[stock];
  if (!price) {
  return res.json({ message: "Invalid stock symbol" });
}

  const user = await User.findOne();
if (!user) {
  return res.json({ message: "User not found" });
}

if (!user.portfolio) {
  user.portfolio = {};
}

  if (!user.portfolio[stock] || user.portfolio[stock].quantity < quantity) {
    return res.json({ message: "Not enough stock to sell" });
  }

  // update balance
  user.balance += quantity * price;

  // update portfolio
  user.portfolio[stock].quantity -= quantity;

  if (user.portfolio[stock].quantity === 0) {
    delete user.portfolio[stock];
  }

  // mark + save
  user.markModified("portfolio");
  await user.save();

  // save transaction
  await Transaction.create({
    type: "SELL",
    stock,
    quantity,
    price,
    timestamp: Date.now()
  });

  res.json({
    message: "Stock sold",
    user
  });
});

app.get("/transactions", async (req, res) => {
  const data = await Transaction.find();
  res.json(data);
});


app.get("/pnl", async (req, res) => {
  const user = await User.findOne();

  if (!user || !user.portfolio) {
    return res.json({});
  }

  let result = {};

  for (let stock in user.portfolio) {
    let data = user.portfolio[stock];
    let currentPrice = prices[stock];

    let pnl = (currentPrice - data.avgPrice) * data.quantity;

    result[stock] = {
      quantity: data.quantity,
      avgPrice: data.avgPrice,
      currentPrice,
      pnl: Number(pnl.toFixed(2)) // fixed type
    };
  }

  res.json(result);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

async function initUser() {
  await User.deleteMany({}); // force clean start

  await User.create({
    balance: 10000,
    portfolio: {}
  });

  console.log("Fresh user created");
}

app.get("/reset", async (req, res) => {
  await User.deleteMany({});
  res.send("DB reset");
});

initUser();

