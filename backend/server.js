require("dotenv").config();
const bcrypt = require("bcryptjs");
const ValueSnapshot = require("./models/ValueSnapshot");
const lastTradeTime = {}; // simple in-memory cooldown
const COOLDOWN_MS = 1500; // 1.5 sec per stock per user
const MAX_QTY_PER_TRADE = 10;
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const User = require("./models/user");
const Transaction = require("./models/transaction");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("Mongo Error:", err.message);
    process.exit(1);
  });
// ---------------- PRICE ENGINE ----------------

let prices = {
  AAPL: 100,
  TSLA: 200,
  GOOG: 150
};

setInterval(() => {
  for (let s in prices) {
    let change = (Math.random() - 0.5) * 10;
    prices[s] = Math.max(1, Number((prices[s] + change).toFixed(2)));
  }
}, 5000);

setInterval(async () => {
  try {
    const user = await User.findOne();
    if (!user) return;

    let holdingsValue = 0;

    for (let stock in (user.portfolio || {})) {
      const data = user.portfolio[stock];
      const price = prices[stock];

      if (!price) continue;

      holdingsValue += data.quantity * price;
    }

    const totalValue = holdingsValue + user.balance;

    await ValueSnapshot.create({
      totalValue
    });

  } catch (err) {
    console.log("Snapshot error:", err.message);
  }
}, 5000);

// ---------------- REGISTER ----------------
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  try {
    await User.create({
      username,
      password: hashed,
      balance: 10000,
      portfolio: {}
    });

    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "User exists" });
  }
});

//-----------------LOGIN ----------------

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "No user" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Wrong password" });

  res.json({ ok: true, userId: user._id });
});

// ---------------- BUY ----------------

app.post("/buy", async (req, res) => {
  try {
    const { stock, quantity, userId } = req.body;
    const qty = Number(quantity);

    if (!stock || !qty || qty <= 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (qty > MAX_QTY_PER_TRADE) {
      return res.status(400).json({
        error: `Max ${MAX_QTY_PER_TRADE} per order`
      });
    }

    const now = Date.now();
    const key = `${userId}_${stock}_buy`;

    if (lastTradeTime[key] && now - lastTradeTime[key] < COOLDOWN_MS) {
      return res.status(429).json({ error: "Cooldown active" });
    }

    lastTradeTime[key] = now;

    const price = prices[stock];
    if (!price) return res.status(400).json({ error: "Invalid stock" });

    // SINGLE user fetch. Not twice.
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.portfolio) user.portfolio = {};

    const cost = qty * price;
    if (user.balance < cost) {
      return res.status(400).json({ error: "No balance" });
    }

    if (!user.portfolio[stock]) {
      user.portfolio[stock] = { quantity: 0, avgPrice: 0 };
    }

    const p = user.portfolio[stock];

    const newQty = p.quantity + qty;
    const newCost = (p.quantity * p.avgPrice) + (qty * price);

    p.quantity = newQty;
    p.avgPrice = newCost / newQty;

    user.balance -= cost;

    user.markModified("portfolio");
    await user.save();

    await Transaction.create({
      userId,
      type: "BUY",
      stock,
      quantity: qty,
      price
    });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: "BUY failed" });
  }
});

// ---------------- SELL ----------------

app.post("/sell", async (req, res) => {
  try {
    const { stock, quantity, userId } = req.body;
    const qty = Number(quantity);

    if (!stock || !qty || qty <= 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (qty > MAX_QTY_PER_TRADE) {
      return res.status(400).json({ error: "Max limit exceeded" });
    }

    const now = Date.now();
    const key = `${userId}_${stock}_sell`;

    if (lastTradeTime[key] && now - lastTradeTime[key] < COOLDOWN_MS) {
      return res.status(429).json({ error: "Cooldown active" });
    }

    lastTradeTime[key] = now;

    const price = prices[stock];

    // SINGLE fetch again
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user?.portfolio?.[stock]) {
      return res.status(400).json({ error: "No stock" });
    }

    const p = user.portfolio[stock];

    if (p.quantity < qty) {
      return res.status(400).json({ error: "Not enough stock" });
    }

    user.balance += qty * price;
    p.quantity -= qty;

    if (p.quantity === 0) delete user.portfolio[stock];

    user.markModified("portfolio");
    await user.save();

    await Transaction.create({
      userId,
      type: "SELL",
      stock,
      quantity: qty,
      price
    });

    res.json({ ok: true });

  } catch {
    res.status(500).json({ error: "SELL failed" });
  }
});

// ---------------- RESET HISTORY (NEW FEATURE) ----------------

app.delete("/history", async (req, res) => {
  await Transaction.deleteMany({});
  res.json({ ok: true });
});

// ---------------- DATA ----------------

app.get("/prices", (req, res) => res.json(prices));

app.get("/portfolio", async (req, res) => {
  res.json(await User.findOne());
});

app.get("/transactions", async (req, res) => {
  res.json(await Transaction.find().sort({ _id: -1 }));
});

app.get("/pnl", async (req, res) => {
  const user = await User.findOne();
  if (!user?.portfolio) return res.json({});

  let out = {};

  for (let s in user.portfolio) {
    let d = user.portfolio[s];
    let cp = prices[s];
    if (!cp) continue;

    out[s] = {
      qty: d.quantity,
      avg: d.avgPrice,
      price: cp,
      pnl: Number(((cp - d.avgPrice) * d.quantity).toFixed(2))
    };
  }

  res.json(out);
});

//-----------DASHBOARD-------------------
app.get("/dashboard", async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const user = await User.findById(userId);
    const transactions = await Transaction.find({ userId }).sort({ _id: -1 });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let portfolio = user.portfolio || {};
    let pnl = {};
    let holdingsValue = 0;

    for (let stock in portfolio) {
      const data = portfolio[stock];
      const currentPrice = prices[stock];

      if (!currentPrice) continue;

      const value = data.quantity * currentPrice;
      holdingsValue += value;

      pnl[stock] = {
        quantity: data.quantity,
        avgPrice: data.avgPrice,
        currentPrice,
        pnl: Number(((currentPrice - data.avgPrice) * data.quantity).toFixed(2)),
        value: Number(value.toFixed(2))
      };
    }

    const totalValue = holdingsValue + user.balance;

    res.json({
      balance: user.balance,
      holdingsValue: Number(holdingsValue.toFixed(2)),
      totalValue: Number(totalValue.toFixed(2)),
      portfolio,
      pnl,
      transactions
    });

  } catch (err) {
    res.status(500).json({ error: "Dashboard failed" });
  }
});

// ----------- LEADERBOARD ----------------
app.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find();

    const leaderboard = users.map((user) => {
      let holdingsValue = 0;

      for (let stock in (user.portfolio || {})) {
        const data = user.portfolio[stock];
        const price = prices[stock];
        if (!price) continue;

        holdingsValue += data.quantity * price;
      }

      const totalValue = holdingsValue + user.balance;

      return {
        username: user.username || "anonymous",
        totalValue: Number(totalValue.toFixed(2))
      };
    });

    leaderboard.sort((a, b) => b.totalValue - a.totalValue);

    res.json(leaderboard);

  } catch {
    res.status(500).json({ error: "Leaderboard failed" });
  }
});

//---------------- HISTORY SNAPSHOT ----------------

app.get("/history/value", async (req, res) => {
  const data = await ValueSnapshot.find().sort({ timestamp: 1 }).limit(100);
  res.json(data);
});

// ---------------- INIT ----------------


app.listen(5000, () => console.log("Server running"));
