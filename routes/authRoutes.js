const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { authRateLimiter } = require("../middleware/rateLimiter");
const { login, logout, me, register } = require("../controllers/authController");

const router = express.Router();

router.post("/register", authRateLimiter, asyncHandler(register));
router.post("/login", authRateLimiter, asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", asyncHandler(me));

module.exports = router;
