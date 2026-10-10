const formatMessage = (message) => {
    if (typeof message !== "string" || !message.trim()) {
        return "Something went wrong. Please try again.";
    }

    const trimmedMessage = message.trim();

    return /[.!?]$/.test(trimmedMessage)
        ? trimmedMessage
        : `${trimmedMessage}.`;
};

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error.";

    // Joi validation errors
    if (err.isJoi) {
        statusCode = 400;
        message = err.details.map((detail) => detail.message).join(", ");
    }

    // Mongoose invalid ObjectId / CastError
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid resource identifier.";
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 409;
        message = "A record with this value already exists.";
    }

    // Mongoose schema validation errors
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((error) => error.message)
            .join(", ");
    }

    // Never expose unexpected internal errors in production
    if (statusCode >= 500) {
        console.error(err);

        message =
            process.env.NODE_ENV === "production"
                ? "Internal server error. Please try again later."
                : message;
    }

    message = formatMessage(message);

    return res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== "production" && {
            stack: err.stack,
        }),
        issues: err.issues || [],
    });
};

export default errorHandler;
