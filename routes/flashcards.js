const express = require("express");
const Flashcard = require("../models/Flashcard");
const User = require("../models/User");
const router = express.Router();
const moment = require("moment");

const authenticateToken = require("../middleware/authToken");

// Get all flashcard sets
router.get("/all",authenticateToken, async (req, res) => {
  try {
    const flashcards = await Flashcard.find();
    res.status(200).json(flashcards);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    // Assuming `req.user` is populated with the logged-in user's details

    console.log("User:", req.user);
    
    const loggedInUserId = req.user.userId;

    console.log("Logged-in user ID:", loggedInUserId);
    

    const admins = await User.find({ role: "admin" });
    const adminIds = admins.map((admin) => admin._id.toString());

    console.log("Admin IDs:", adminIds);
    

    // Query for flashcards created by either admins or the logged-in user
    const flashcards = await Flashcard.find({
      createdBy: { $in: [...adminIds, loggedInUserId] },
    });

    res.status(200).json(flashcards);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Get a specific flashcard set by ID
router.get("/:id", async (req, res) => {
  try {
    const flashcard = await Flashcard.findById(req.params.id);
    if (!flashcard)
      return res.status(404).json({ message: "Flashcard set not found" });
    res.status(200).json(flashcard);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Create a new flashcard set
// router.post("/", async (req, res) => {
//     try {
//       const { createdBy } = req.body;  // Extract createdBy from the request body

//       if (!createdBy) {
//         return res.status(400).json({ message: "User ID (createdBy) is required" });
//       }

//       // Count today's creations for the user
//       const today = moment().startOf("day");
//       const count = await Flashcard.countDocuments({
//         createdBy,
//         createdAt: { $gte: today.toDate(), $lte: moment().endOf("day").toDate() },
//       });

//       if (count >= 20) {
//         return res
//           .status(403)
//           .json({ message: "Creation limit reached for today (20 sets)." });
//       }

//       const newFlashcard = new Flashcard(req.body);
//       const savedFlashcard = await newFlashcard.save();
//       res.status(201).json(savedFlashcard);
//     } catch (error) {
//       console.error(error);  // Log the error for more detailed insights
//       res.status(400).json({ message: "Invalid data", error: error.message });
//     }
//   });

const mongoose = require("mongoose");

router.post("/", async (req, res) => {
  try {
    console.log("Request received:", req.body); // Log the incoming request
    const { createdBy } = req.body;

    if (!createdBy) {
      console.log("Missing createdBy"); // Check if validation fails
      return res
        .status(400)
        .json({ message: "User ID (createdBy) is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      console.log("Invalid User ID format");
      return res.status(400).json({ message: "Invalid User ID format" });
    }

    const user = await User.findById(createdBy);
    console.log("User fetched:", user);

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const dailyLimit = user.dailyLimit || 20;
    console.log(`Daily limit for user ${createdBy}:`, dailyLimit);

    const today = moment().startOf("day");
    const count = await Flashcard.countDocuments({
      createdBy,
      createdAt: { $gte: today.toDate(), $lte: moment().endOf("day").toDate() },
    });

    console.log("Today's creations count:", count);

    if (count >= dailyLimit) {
      console.log("Daily limit reached");
      return res
        .status(403)
        .json({ message: `Creation limit reached (${dailyLimit}).` });
    }

    // const newFlashcard = new Flashcard(req.body);
    const newFlashcard = new Flashcard({
      ...req.body,
      role: user.role, // Add role from the user
      username: user.username, // Add username from the user
    });
    const savedFlashcard = await newFlashcard.save();
    console.log("Flashcard saved:", savedFlashcard);
    res.status(201).json(savedFlashcard);
  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update a flashcard set by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedFlashcard = await Flashcard.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    if (!updatedFlashcard)
      return res.status(404).json({ message: "Flashcard set not found" });
    res.status(200).json(updatedFlashcard);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error });
  }
});

// Hide/unhide a card
router.put("/:id/hide/:cardIndex", async (req, res) => {
  try {
    const { id, cardIndex } = req.params;
    const flashcard = await Flashcard.findById(id);

    if (!flashcard)
      return res.status(404).json({ message: "Flashcard set not found" });

    if (!flashcard.cards[cardIndex]) {
      return res.status(404).json({ message: "Card not found" });
    }

    flashcard.cards[cardIndex].hidden = !flashcard.cards[cardIndex].hidden;
    await flashcard.save();
    res.status(200).json(flashcard);
  } catch (error) {
    res.status(500).json({ message: "Error toggling card visibility", error });
  }
});

// Rate a flashcard set
router.post("/:id/rate", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, rating } = req.body; // No username in the request

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Invalid rating. Must be between 1 and 5." });
    }

    const flashcard = await Flashcard.findById(id);
    if (!flashcard) {
      return res.status(404).json({ message: "Flashcard not found" });
    }

    // Fetch username from the User model
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const username = user.username; // Get username from the user document

    const existingRating = flashcard.ratings.find((r) => r.userId === userId);
    if (existingRating) {
      existingRating.rating = rating; // Update the rating
    } else {
      flashcard.ratings.push({ userId, rating, username }); // Add new rating with username
    }

    // Recalculate average rating
    flashcard.averageRating =
      flashcard.ratings.reduce((sum, r) => sum + r.rating, 0) /
      flashcard.ratings.length;

    await flashcard.save();
    res.status(200).json(flashcard);
  } catch (error) {
    console.error("Error in rating flashcard:", error);
    res
      .status(500)
      .json({ message: "Error rating flashcard", error: error.message });
  }
});


// Delete a flashcard set by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedFlashcard = await Flashcard.findByIdAndDelete(req.params.id);
    if (!deletedFlashcard)
      return res.status(404).json({ message: "Flashcard set not found" });
    res
      .status(200)
      .json({ message: "Flashcard set deleted", deletedFlashcard });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
// f9YEOuxJUivj92VK
