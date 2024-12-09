const express = require("express");
const User = require("../models/User");
require("dotenv").config();

const router = express.Router();
const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET, // Use an environment variable for the secret
      { expiresIn: "1d" } // Token expiration time
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

// Middleware to check admin privileges
const isAdmin = (req, res, next) => {
  const { role } = req.user; // Assume req.user is set by authentication middleware
  if (role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};
// Update daily limit for all users (Admin only)
router.put("/daily-limit", async (req, res) => {
  try {
    const { dailyLimit } = req.body; // The new daily limit value

    if (dailyLimit === undefined) {
      return res.status(400).json({ message: "New daily limit is required" });
    }

    // Replace dailyLimit for all users
    const updatedUsers = await User.updateMany(
      {}, // Apply to all users
      { $set: { dailyLimit: dailyLimit } }, // Set the new dailyLimit value
      { new: true } // Return the updated document (not necessary in this case, since updateMany doesn't return updated documents)
    );

    res.status(200).json({
      message: `Daily limit for all users set to ${dailyLimit}`,
      updatedUsers,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating daily limit", error });
  }
});

// Update daily limit for a user
router.put("/:userId/daily-limit", isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { dailyLimit } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { dailyLimit },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Daily limit updated", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating daily limit", error });
  }
});

// Get all users (Admin only)
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude password

    if (!users) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({ users });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving users", error: error.message });
  }
});

router.put("/:userId", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      req.body,
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating user", error: error.message });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving user", error: error.message });
  }
});

router.delete("/:userId", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted", deletedUser });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
});

module.exports = router;
