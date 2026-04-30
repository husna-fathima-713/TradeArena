const mongoose = require("mongoose");

const valueSnapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  totalValue: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ValueSnapshot", valueSnapshotSchema);