import { logServerError } from "../utils/logger.js";
import multer from "multer";

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

    if (err instanceof multer.MulterError) {
        statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        message = err.code === "LIMIT_FILE_SIZE"
            ? "Image must not exceed 5 MB."
            : "Invalid image upload. Use up to 5 JPEG, PNG, or WebP images.";
    }

    // Joi validation errors
    if (err.isJoi) {
        statusCode = 400;
        message = err.details.map((detail) => detail.message).join(", ");
    }

    // MongoDB duplicate key error
    else if (err.code === 11000) {
        statusCode = 409;

        const field = Object.keys(err.keyPattern ?? {})[0];

        const messages = {
            email: "Email is already registered.",
            phone: "Phone number is already registered().",
        };

        message = messages[field] ?? "A record with this value already exists.";
    }

    // Mongoose invalid ObjectId / CastError
    else if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid resource identifier.";
    }

    // Mongoose schema validation errors
    else if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((error) => error.message)
            .join(", ");
    }

    // Hide unexpected internal errors in production
    if (statusCode >= 500) {
        logServerError(err, req, statusCode);

        if (process.env.NODE_ENV === "production") {
            message = "Internal server error. Please try again later.";
        }
    }

    message = formatMessage(message);

    return res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== "production" && {
            stack: err.stack,
        }),
        ...(req.requestId && { requestId: req.requestId }),
        issues: err.issues || [],
    });
};

export default errorHandler;
