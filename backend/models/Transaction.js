const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: String,
  stock: String,
  quantity: Number,
  price: Number,
  timestamp: Number
});

module.exports = mongoose.model("Transaction", transactionSchema);