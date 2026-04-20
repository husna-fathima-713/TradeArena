const mongoose = require("mongoose");

const ValueSnapshotSchema = new mongoose.Schema({
  totalValue: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ValueSnapshot", ValueSnapshotSchema);