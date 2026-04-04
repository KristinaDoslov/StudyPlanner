const express = require("express");
const path = require("path");
const session = require("express-session");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { errorHandler } = require("./middlewares/errorHandler");

function createSessionConfig() {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required in production.");
  }

  return {
    secret: process.env.SESSION_SECRET || "study-planner-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };
}

function createApp() {
  const app = express();

  app.use(express.json());
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(createSessionConfig()));

  app.use(express.static(path.join(__dirname, "public")));
  app.use("/api/auth", authRoutes);
  app.use("/api", taskRoutes);

  app.use("/api", (request, response) => {
    response.status(404).json({ error: "Resource not found." });
  });

  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
