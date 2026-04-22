const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true
  },
  password: String,

  balance: {
    type: Number,
    default: 10000
  },
  portfolio: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model("User", userSchema);