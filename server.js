const { createApp } = require("./app");
const { initializeDatabase } = require("./services/db");

const PORT = process.env.PORT || 3000;
const app = createApp();

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Study Planner server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
