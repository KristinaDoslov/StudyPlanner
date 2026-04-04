function asyncHandler(handler) {
	return function wrappedHandler(request, response, next) {
		Promise.resolve(handler(request, response, next)).catch(next);
	};
}

class HttpError extends Error {
	constructor(statusCode, message) {
		super(message);
		this.name = "HttpError";
		this.statusCode = statusCode;
	}
}

function errorHandler(error, request, response, next) {
	if (response.headersSent) {
		next(error);
		return;
	}

	if (error instanceof HttpError) {
		response.status(error.statusCode).json({ error: error.message });
		return;
	}

	console.error(error);
	response.status(500).json({ error: "Internal server error" });
}

module.exports = {
	asyncHandler,
	HttpError,
	errorHandler,
};
