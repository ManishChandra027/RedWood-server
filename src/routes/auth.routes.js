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
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

// Register
router.post("/register", validate(registerSchema), registerUser);

// Login
router.post("/login", validate(loginSchema), loginUser);

// Logout: requires an authenticated user
router.post("/logout", verifyJwt, logoutUser);

// Change password
// router.patch(
//     "/change-password",
//     verifyJwt,
//     validate(updatePasswordSchema),
//     updatePassword
// );

// // Request email verification OTP
// router.post("/request-email-verification", verifyJwt, requestEmailVerification);

// // Verify email OTP
// router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);

// // Request password reset OTP
// router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

// // Verify password reset OTP
// router.post(
//     "/verify-reset-otp",
//     validate(verifyPasswordResetOtpSchema),
//     verifyPasswordResetOtp
// );

// // Reset password
// router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
