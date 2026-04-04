const express = require("express");
const { asyncHandler } = require("../middlewares/errorHandler");
const { authRateLimiter } = require("../middlewares/rateLimiter");
const { login, logout, me, register } = require("../controllers/authController");

const router = express.Router();

router.post("/register", authRateLimiter, asyncHandler(register));
router.post("/login", authRateLimiter, asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", asyncHandler(me));

module.exports = router;
