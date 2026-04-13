const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  balance: Number,
  portfolio: Object
});

module.exports = mongoose.model("User", userSchema);