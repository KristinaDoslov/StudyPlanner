const { get, run } = require("./db");

function findUserByEmail(email) {
  return get("SELECT id, name, email, password_hash FROM users WHERE email = ?", [email]);
}

function findUserById(id) {
  return get("SELECT id, name, email FROM users WHERE id = ?", [id]);
}

async function createUser(name, email, passwordHash) {
  const result = await run(
    "INSERT INTO users(name, email, password_hash) VALUES (?, ?, ?)",
    [name, email, passwordHash]
  );

  return { id: result.id, name, email };
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
};
