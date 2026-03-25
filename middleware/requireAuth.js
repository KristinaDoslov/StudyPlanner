function requireAuth(request, response, next) {
  if (!request.session.userId) {
    response.status(401).json({ error: "You are not authenticated." });
    return;
  }

  next();
}

module.exports = requireAuth;
