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

app.get("/", (req, res) => {
  res.send("TradeArena Backend Running");
});

app.get("/portfolio", async (req, res) => {
  const user = await User.findOne();
  
  res.json(user);
});

app.post("/buy", async (req, res) => {
  const { stock, quantity, price } = req.body;

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
    user.portfolio[stock] = 0;
  }

  user.portfolio[stock] += quantity;

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
  const { stock, quantity, price } = req.body;

  const user = await User.findOne();
if (!user) {
  return res.json({ message: "User not found" });
}

if (!user.portfolio) {
  user.portfolio = {};
}

  if (!user.portfolio[stock] || user.portfolio[stock] < quantity) {
    return res.json({ message: "Not enough stock to sell" });
  }

  // update balance
  user.balance += quantity * price;

  // update portfolio
  user.portfolio[stock] -= quantity;

  if (user.portfolio[stock] === 0) {
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

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

async function initUser() {
  let existingUser = await User.findOne();

  if (!existingUser) {
    await User.create({
      balance: 10000,
      portfolio: {}
    });
    console.log("User initialized");
  }
}

app.get("/reset", async (req, res) => {
  await User.deleteMany({});
  res.send("DB reset");
});

initUser();