
import expressRateLimit from "express-rate-limit";

const rateLimit = (limit = 10, time = 15) => {
    return expressRateLimit({
        windowMs: time * 60 * 1000,
        limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
            success: false,
            message: "Too many requests. Please try again later.",
        },
    });
};

export default rateLimit;
