import * as authService from "../services/auth.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
};

const resetCookieOptions = {
    ...cookieOptions,
    maxAge: 10 * 60 * 1000, // 10 minutes
};

// REGISTER
const registerUser = asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;

    const { user, accessToken, refreshToken } = await authService.registerUser({
        email,
        password,
        fullName,
    });

    return res
        .status(201)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(201, { user }, "User registered successfully"));
});

// LOGIN
const loginUser = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    const isEmail = identifier.includes("@");

    const query = isEmail ? { email: identifier } : { phone: identifier };

    const { user, accessToken, refreshToken } = await authService.loginUser({
        query,
        password,
    });

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user }, "User logged in successfully"));
});

// LOGOUT
const logoutUser = asyncHandler(async (req, res) => {
    await authService.logoutUser(req.user._id);

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, null, "User logged out successfully"));
});

// CURRENT USER


// REFRESH ACCESS TOKEN
const refreshAccessToken = asyncHandler(async (req, res) => {
    const { accessToken, refreshToken } = await authService.refreshAccessToken(
        req.user._id
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, null, "Access token refreshed successfully")
        );
});

// CHANGE PASSWORD
const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, updatedPassword } = req.body;

    await authService.updatePassword({
        userId: req.user._id,
        currentPassword,
        updatedPassword,
    });

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(
                200,
                null,
                "Password changed successfully. Please log in again."
            )
        );
});

// REQUEST PASSWORD RESET OTP
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    await authService.forgotPassword(email);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "If an account exists with this email, a 6-digit password reset code has been sent. Please check your inbox."
            )
        );
});

// VERIFY PASSWORD RESET OTP
const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const rawToken = await authService.verifyPasswordResetOtp({
        email,
        otp,
    });

    return res
        .status(200)
        .cookie("passwordResetToken", rawToken, resetCookieOptions)
        .json(new ApiResponse(200, null, "OTP verified successfully"));
});

// RESET PASSWORD USING RESET TOKEN COOKIE
const resetPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    const rawToken = req.cookies?.passwordResetToken;

    if (!rawToken) {
        throw new ApiError(
            401,
            "Password reset session is missing or expired."
        );
    }

    await authService.resetPassword({
        rawToken,
        newPassword,
    });

    return res
        .status(200)
        .clearCookie("passwordResetToken", cookieOptions)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(
                200,
                null,
                "Password reset successfully. Please log in again."
            )
        );
});

// REQUEST EMAIL VERIFICATION OTP
const requestEmailVerification = asyncHandler(async (req, res) => {
    await authService.requestEmailVerification(req.user._id);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Verification code sent if your email requires verification."
            )
        );
});

// VERIFY EMAIL OTP
const verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    await authService.verifyEmail({ email, otp });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Email verified successfully"));
});

export {
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
};
