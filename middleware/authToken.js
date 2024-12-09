const express = require("express");
require("dotenv").config();

const jwt = require("jsonwebtoken");



// Middleware to authenticate token
 const authenticateToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1]; // Bearer <token>
  
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid token" });
      }
      req.user = user; // Attach user info to the request object
      next();
    });
  };

module.exports = authenticateToken;