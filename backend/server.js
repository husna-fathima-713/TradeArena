const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const User = require("./models/User");
const Transaction = require("./models/Transaction");

const app = express();

app.use(cors());
app.use(express.json());

// -------------------- PRICE ENGINE --------------------

let prices = {
  AAPL: 100,
  TSLA: 200,
  GOOG: 150
};

setInterval(() => {
  for (let stock in prices) {
    let change = (Math.random() - 0.5) * 10;
    prices[stock] = Math.max(
      1,
      Number((prices[stock] + change).toFixed(2))
    );
  }

  console.log("Updated Prices:", prices);
}, 5000);

// -------------------- DB CONNECT --------------------

mongoose.connect("mongodb://127.0.0.1:27017/tradearena")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

console.log("Trying to connect to MongoDB...");

// -------------------- ROUTES --------------------

// Health check
app.get("/", (req, res) => {
  res.send("TradeArena Backend Running");
});

// Prices
app.get("/prices", (req, res) => {
  res.json(prices);
});

// Portfolio
app.get("/portfolio", async (req, res) => {
  const user = await User.findOne();
  res.json(user);
});

// -------------------- BUY --------------------

app.post("/buy", async (req, res) => {
  try {
    console.log("BUY API HIT");

    const { stock, quantity } = req.body;

    const user = await User.findOne(); // ✅ MOVE THIS UP

    console.log("PORTFOLIO STATE:", user.portfolio); // NOW SAFE

    if (!stock || !quantity || quantity <= 0) {
      return res.json({ message: "Invalid input" });
    }

    const price = prices[stock];
    if (!price) {
      return res.json({ message: "Invalid stock symbol" });
    }

    if (!user) {
      return res.json({ message: "User not found" });
    }

    if (!user.portfolio) user.portfolio = {};

    const cost = quantity * price;

    if (user.balance < cost) {
      return res.json({ message: "Insufficient balance" });
    }

    if (!user.portfolio[stock]) {
      user.portfolio[stock] = { quantity: 0, avgPrice: 0 };
    }

    let existing = user.portfolio[stock];

    let totalCost =
      (existing.quantity * existing.avgPrice) +
      (quantity * price);

    let totalQuantity = existing.quantity + quantity;

    existing.quantity = totalQuantity;
    existing.avgPrice = totalCost / totalQuantity;

    user.balance -= cost;

    user.markModified("portfolio");
    await user.save();

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

  } catch (err) {
    console.error("BUY FAILED:", err);
    res.status(500).json({ error: "BUY failed", details: err.message });
  }
});

// -------------------- SELL --------------------

app.post("/sell", async (req, res) => {
  try {
    console.log("SELL API HIT");

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

    if (!user.portfolio || !user.portfolio[stock]) {
      return res.json({ message: "No stock owned" });
    }

    if (user.portfolio[stock].quantity < quantity) {
      return res.json({ message: "Not enough stock" });
    }

    user.balance += quantity * price;
    user.portfolio[stock].quantity -= quantity;

    if (user.portfolio[stock].quantity === 0) {
      delete user.portfolio[stock];
    }

    user.markModified("portfolio");
    await user.save();

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

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SELL failed" });
  }
});

// -------------------- TRANSACTIONS --------------------

app.get("/transactions", async (req, res) => {
  const data = await Transaction.find();
  res.json(data);
});

// -------------------- PNL --------------------

app.get("/pnl", async (req, res) => {
  const user = await User.findOne();

  if (!user || !user.portfolio) {
    return res.json({});
  }

  let result = {};

  for (let stock in user.portfolio) {
    let data = user.portfolio[stock];
    let currentPrice = prices[stock];

    if (!currentPrice) continue;

    let pnl = (currentPrice - data.avgPrice) * data.quantity;

    result[stock] = {
      quantity: data.quantity,
      avgPrice: data.avgPrice,
      currentPrice,
      pnl: Number(pnl.toFixed(2))
    };
  }

  res.json(result);
});

// -------------------- DASHBOARD --------------------

app.get("/dashboard", async (req, res) => {
  try {
    const user = await User.findOne();
    const transactions = await Transaction.find();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let pnl = {};

    for (let stock in (user.portfolio || {})) {
      let data = user.portfolio[stock];
      let currentPrice = prices[stock];

      if (!currentPrice) continue;

      pnl[stock] = {
        quantity: data.quantity,
        avgPrice: data.avgPrice,
        currentPrice,
        pnl: Number(
          ((currentPrice - data.avgPrice) * data.quantity).toFixed(2)
        )
      };
    }

    res.json({
      portfolio: user.portfolio || {},
      balance: user.balance,
      pnl,
      transactions
    });

  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// -------------------- RESET --------------------

app.get("/reset", async (req, res) => {
  await User.deleteMany({});
  res.send("DB reset");
});

// -------------------- INIT USER --------------------

async function initUser() {
  await User.deleteMany({});

  await User.create({
    balance: 10000,
    portfolio: {}
  });

  console.log("Fresh user created");
}

// -------------------- START SERVER --------------------

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

initUser();