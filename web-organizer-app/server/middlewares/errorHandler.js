function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  const status = Number(err.statusCode) || 500;
  const message = err.message || "Unexpected server error.";

  if (status >= 500) {
    console.error("Internal error:", err);
  }

  res.status(status).json({
    success: false,
    message
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
