import ApiError from "../utils/ApiError.js";

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return next(new ApiError(401, "Authentication is required."));
    }

    if (req.user.role !== "admin") {
        return next(new ApiError(403, "Administrator access is required."));
    }

    return next();
};

export default requireAdmin;
