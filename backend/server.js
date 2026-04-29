require("dotenv").config();
const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const User = require("./models/User");
const Transaction = require("./models/Transaction");
const ValueSnapshot = require("./models/ValueSnapshot");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("Mongo Error:", err.message);
    process.exit(1);
  });

// ---------------- CONFIG ----------------
const lastTradeTime = {};
const COOLDOWN_MS = 1500;
const MAX_QTY_PER_TRADE = 10;

// ---------------- PRICE ENGINE (UPGRADED) ----------------
let prices = {
  AAPL: 100,
  TSLA: 200,
  GOOG: 150
};

const stockProfiles = {
  AAPL: { volatility: 2, drift: 0.3 },
  TSLA: { volatility: 5, drift: 0.1 },
  GOOG: { volatility: 3, drift: 0.2 }
};

setInterval(() => {
  for (let s in prices) {
    const { volatility, drift } = stockProfiles[s];

    const trend = Math.random() > 0.5 ? 1 : -1;
    const move = Math.random() * volatility;

    let spike = 0;
    if (Math.random() > 0.97) {
      spike = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 15);
    }

    const change = trend * move + drift + spike;

    prices[s] = Math.max(1, Number((prices[s] + change).toFixed(2)));
  }
}, 5000);

// ---------------- SNAPSHOT ----------------
setInterval(async () => {
  try {
    const users = await User.find();

    for (let user of users) {
      let holdingsValue = 0;

      for (let stock in (user.portfolio || {})) {
        const data = user.portfolio[stock];
        const price = prices[stock];
        if (!price) continue;

        holdingsValue += data.quantity * price;
      }

      await ValueSnapshot.create({
        totalValue: holdingsValue + user.balance
      });
    }
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

// ---------------- LOGIN ----------------
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

    if (!stock || !qty || qty <= 0)
      return res.status(400).json({ error: "Invalid input" });

    if (qty > MAX_QTY_PER_TRADE)
      return res.status(400).json({ error: `Max ${MAX_QTY_PER_TRADE}` });

    const key = `${userId}_${stock}_buy`;
    const now = Date.now();

    if (lastTradeTime[key] && now - lastTradeTime[key] < COOLDOWN_MS)
      return res.status(429).json({ error: "Cooldown" });

    lastTradeTime[key] = now;

    const price = prices[stock];
    if (!price) return res.status(400).json({ error: "Invalid stock" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.portfolio) user.portfolio = {};

    const cost = qty * price;
    if (user.balance < cost)
      return res.status(400).json({ error: "No balance" });

    if (!user.portfolio[stock])
      user.portfolio[stock] = { quantity: 0, avgPrice: 0 };

    const p = user.portfolio[stock];

    const newQty = p.quantity + qty;
    const newCost = (p.quantity * p.avgPrice) + (qty * price);

    p.quantity = newQty;
    p.avgPrice = newCost / newQty;

    user.balance -= cost;

    user.markModified("portfolio");
    await user.save();

    await Transaction.create({ userId, type: "BUY", stock, quantity: qty, price });

    res.json({ ok: true });

  } catch {
    res.status(500).json({ error: "BUY failed" });
  }
});

// ---------------- SELL ----------------
app.post("/sell", async (req, res) => {
  try {
    const { stock, quantity, userId } = req.body;
    const qty = Number(quantity);

    if (!stock || !qty || qty <= 0)
      return res.status(400).json({ error: "Invalid input" });

    const key = `${userId}_${stock}_sell`;
    const now = Date.now();

    if (lastTradeTime[key] && now - lastTradeTime[key] < COOLDOWN_MS)
      return res.status(429).json({ error: "Cooldown" });

    lastTradeTime[key] = now;

    const price = prices[stock];

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user?.portfolio?.[stock])
      return res.status(400).json({ error: "No stock" });

    const p = user.portfolio[stock];

    if (p.quantity < qty)
      return res.status(400).json({ error: "Not enough stock" });

    user.balance += qty * price;
    p.quantity -= qty;

    if (p.quantity === 0) delete user.portfolio[stock];

    user.markModified("portfolio");
    await user.save();

    await Transaction.create({ userId, type: "SELL", stock, quantity: qty, price });

    res.json({ ok: true });

  } catch {
    res.status(500).json({ error: "SELL failed" });
  }
});

// ---------------- PRICES ----------------
app.get("/prices", (req, res) => {
  const entries = Object.entries(prices);

  let topGainer = entries[0];
  let topLoser = entries[0];

  for (let [s, p] of entries) {
    if (p > topGainer[1]) topGainer = [s, p];
    if (p < topLoser[1]) topLoser = [s, p];
  }

  res.json({ prices, topGainer, topLoser });
});

// ---------------- TRANSACTIONS (FIXED) ----------------
app.get("/transactions", async (req, res) => {
  const { userId } = req.query;
  const data = await Transaction.find({ userId }).sort({ _id: -1 }).limit(10);
  res.json(data);
});

// ---------------- DASHBOARD ----------------
app.get("/dashboard", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const transactions = await Transaction.find({ userId }).sort({ _id: -1 });

    let holdingsValue = 0;
    let pnl = {};

    for (let stock in (user.portfolio || {})) {
      const d = user.portfolio[stock];
      const cp = prices[stock];
      if (!cp) continue;

      const value = d.quantity * cp;
      holdingsValue += value;

      pnl[stock] = {
        quantity: d.quantity,
        avgPrice: d.avgPrice,
        currentPrice: cp,
        pnl: Number(((cp - d.avgPrice) * d.quantity).toFixed(2))
      };
    }

    res.json({
      balance: user.balance,
      holdingsValue: Number(holdingsValue.toFixed(2)),
      totalValue: Number((holdingsValue + user.balance).toFixed(2)),
      portfolio: user.portfolio,
      pnl,
      transactions
    });

  } catch {
    res.status(500).json({ error: "Dashboard failed" });
  }
});

// ---------------- LEADERBOARD ----------------
app.get("/leaderboard", async (req, res) => {
  const users = await User.find();

  const board = users.map(u => {
    let holdingsValue = 0;

    for (let s in (u.portfolio || {})) {
      const d = u.portfolio[s];
      const price = prices[s];
      if (!price) continue;

      holdingsValue += d.quantity * price;
    }

    return {
      username: u.username,
      totalValue: Number((holdingsValue + u.balance).toFixed(2))
    };
  });

  board.sort((a, b) => b.totalValue - a.totalValue);
  res.json(board);
});

// ---------------- HISTORY ----------------
app.get("/history/value", async (req, res) => {
  const data = await ValueSnapshot.find().sort({ timestamp: 1 }).limit(100);
  res.json(data);
});

// ---------------- START ----------------
app.listen(5000, () => console.log("Server running on 5000"));