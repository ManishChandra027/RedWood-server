import { Router } from "express";

import {
    registerSchema,
    loginSchema,
    updatePasswordSchema,
    forgotPasswordSchema,
    verifyPasswordResetOtpSchema,
    resetPasswordSchema,
    verifyEmailSchema,
} from "../validations/auth.validation.js";

import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updatePassword,
    forgotPassword,
    verifyPasswordResetOtp,
    resetPassword,
    requestEmailVerification,
    verifyEmail,
} from "../controllers/auth.controller.js";

import validate from "../middleware/validate.middleware.js";
import { verifyJwt, verifyRefreshToken } from "../middleware/auth.middleware.js";
import rateLimit from "../middleware/rateLimit.middleware.js";

const router = Router();

// Register
router.post(
    "/register",
    rateLimit("register", 5, 15, {
        keyGenerator: (req) => [req.ip, `email:${req.body?.email?.toLowerCase() || ""}`],
    }),
    validate(registerSchema),
    registerUser
);

// Login
router.post(
    "/login",
    rateLimit("login", 10, 15, {
        keyGenerator: (req) => [req.ip, `identifier:${req.body?.identifier?.toLowerCase() || ""}`],
    }),
    validate(loginSchema),
    loginUser
);

// Logout: requires an authenticated user
router.post("/logout",verifyJwt, logoutUser);

router.post("/refresh-token", verifyRefreshToken, refreshAccessToken);

// Change password
router.patch(
    "/change-password",
    verifyJwt,
    validate(updatePasswordSchema),
    updatePassword
);

// // Request email verification OTP
router.post(
    "/request-email-verification",
    verifyJwt,
    rateLimit("request-email-verification", 3, 60, {
        keyGenerator: (req) => [req.ip, `user:${req.user._id}`],
    }),
    requestEmailVerification
);

// // Verify email OTP
router.post(
    "/verify-email",
    verifyJwt,
    rateLimit("verify-email", 10, 15, {
        keyGenerator: (req) => [req.ip, `user:${req.user._id}`],
    }),
    validate(verifyEmailSchema),
    verifyEmail
);

// // Request password reset OTP
router.post(
    "/forgot-password",
    rateLimit("forgot-password", 5, 15, {
        keyGenerator: (req) => [req.ip, `email:${req.body?.email?.toLowerCase() || ""}`],
    }),
    validate(forgotPasswordSchema),
    forgotPassword
);

// // Verify password reset OTP
router.post(
    "/verify-reset-otp",
    rateLimit("verify-reset-otp", 5, 15, {
        keyGenerator: (req) => [req.ip, `email:${req.body?.email?.toLowerCase() || ""}`],
    }),
    validate(verifyPasswordResetOtpSchema),
    verifyPasswordResetOtp
);

// // Reset password
router.post("/reset-password", rateLimit("reset-password", 5, 15), validate(resetPasswordSchema), resetPassword);

export default router;
