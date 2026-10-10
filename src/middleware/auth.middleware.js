import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

const getAccessToken = (req) => {
    const cookieToken = req.cookies?.accessToken;

    if (cookieToken) return cookieToken;

    const authorization = req.get("Authorization");

    if (!authorization) return null;

    const [scheme, token, ...extra] = authorization.trim().split(/\s+/);

    if (scheme?.toLowerCase() !== "bearer" || !token || extra.length > 0) {
        return null;
    }

    return token;
};

const verifyJwt = asyncHandler(async (req, res, next) => {
    const token = getAccessToken(req);

    if (!token) {
        throw new ApiError(401, "Access token is required.");
    }

    let decodedToken;

    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
        throw new ApiError(401, "Invalid or expired access token.");
    }

    if (!decodedToken?._id) {
        throw new ApiError(401, "Invalid access token payload.");
    }

    const user = await User.findById(decodedToken._id);

    if (!user) {
        throw new ApiError(401, "User no longer exists.");
    }

    req.user = user;

    next();
});

const optionalVerifyJwt = asyncHandler(async (req, res, next) => {
    const token = getAccessToken(req);

    // Guest request: authentication is optional.
    if (!token) {
        return next();
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (!decodedToken?._id) {
            return next();
        }

        const user = await User.findById(decodedToken._id);

        if (user) {
            req.user = user;
        }
    } catch {
        // Invalid or expired token: continue as guest.
    }

    next();
});

const verifyRefreshToken = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
        throw new ApiError(401, "Refresh token is required.");
    }

    let decodedToken;

    try {
        decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token.");
    }

    if (!decodedToken?._id) {
        throw new ApiError(401, "Invalid refresh token payload.");
    }

    const user = await User.findById(decodedToken._id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
        throw new ApiError(401, "Invalid or expired refresh token.");
    }

    req.user = user;

    next();
});

export { verifyJwt, optionalVerifyJwt, verifyRefreshToken };
