const mongoose = require("mongoose");

const FlashcardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  createdBy: { type: String, required: true }, // User ID
  createdAt: { type: Date, default: Date.now },
  cards: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
      hidden: { type: Boolean, default: false },
    },
  ],
  role: { type: String, enum: ["user", "admin"], default: "user" },
  username: { type: String},
  ratings: [
    {
      userId: { type: String, required: true },
      username: { type: String},
      rating: { type: Number, min: 1, max: 5, required: true },
    },
  ],
  averageRating: { type: Number, default: 0 },
});

module.exports = mongoose.model("Flashcard", FlashcardSchema);
