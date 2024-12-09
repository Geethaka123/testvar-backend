const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" }, // "user" or "admin"
  dailyLimit: { type: Number, default: 20 }, // Daily limit for flashcard creation
  lastDailyLimitUpdate: { type: Date, default: Date.now }, // Timestamp for when the daily limit was last updated
  preferences: { type: Map, of: String }, // Optional: for storing user preferences (e.g., theme, language)
});

module.exports = mongoose.model("User", UserSchema);
