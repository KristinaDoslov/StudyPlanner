const bcrypt = require("bcryptjs");
const { findUserByEmail, findUserById, createUser } = require("../services/authService");
const { loginSchema, registerSchema } = require("../validation/schemas");

function zodErrorMessage(error) {
  return error?.issues?.[0]?.message || "Invalid request payload.";
}

async function register(request, response) {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: zodErrorMessage(parsed.error) });
    return;
  }

  const { name, email, password } = parsed.data;

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    response.status(409).json({ error: "A user with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser(name.trim(), email, passwordHash);

  request.session.userId = user.id;
  response.status(201).json(user);
}

async function login(request, response) {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: zodErrorMessage(parsed.error) });
    return;
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);

  if (!user) {
    response.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    response.status(401).json({ error: "Invalid email or password." });
    return;
  }

  request.session.userId = user.id;
  response.json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
}

function logout(request, response) {
  request.session.destroy((error) => {
    if (error) {
      response.status(500).json({ error: "Internal server error" });
      return;
    }

    response.clearCookie("connect.sid");
    response.status(204).send();
  });
}

async function me(request, response) {
  if (!request.session.userId) {
    response.status(401).json({ error: "You are not authenticated." });
    return;
  }

  const user = await findUserById(request.session.userId);
  if (!user) {
    response.status(401).json({ error: "Session is not valid." });
    return;
  }

  response.json(user);
}

module.exports = {
  register,
  login,
  logout,
  me,
};
