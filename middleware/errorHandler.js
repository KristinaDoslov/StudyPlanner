function asyncHandler(handler) {
  return function wrappedHandler(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Internal server error" });
}

module.exports = {
  asyncHandler,
  errorHandler,
};
