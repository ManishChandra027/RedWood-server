import * as authService from "../services/auth.service";
import ApiResponse from "../utils/ApiResponse";
import asyncHandler from "../utils/asyncHandler";

const cookieOptions = {
    httpOnly: true,
    secure: true,
    // sameSite: "lax",
};


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
        .json(
            new ApiResponse(
                201,
                {
                    user,
                    accessToken,
                },
                "User registered successfully"
            )
        );
});

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

const logoutUser = asyncHandler(async (req, res) => {
    await authService.logoutUser(req.user._id);

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, null, "User logged out successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const userInfo = await authService.getCurrentUser({
        userId: req.user._id,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, userInfo, "Current user fetched successfully")
        );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { accessToken, refreshToken } =
        await authService.refreshAccessToken(userId);

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken,
                },
                "Access token refreshed successfully"
            )
        );
});

const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, updatedPassword } = req.body;

    await authService.updatePassword({
        userId: req.user._id,
        currentPassword,
        updatedPassword,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Password changed successfully"));
});

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

const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
    const { otp, email } = req.body;

    const rawToken = await authService.verifyPasswordResetOtp({
        email,
        otp,
    });

    return res
        .status(200)
        .cookie("passwordResetToken", rawToken, resetCookieOptions)
        .json(new ApiResponse(200, null, "OTP verified successfully"));
});

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
        .json(new ApiResponse(200, null, "Password reset successfully"));
});

const requestEmailVerification = asyncHandler(async (req, res) => {
    await authService.requestEmailVerification(req.user._id);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "If an email exists, a verify link has been sent."
            )
        );
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    await authService.verifyEmail({ email, otp });

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Email verified successfully"
        )
    );
});



export { registerUser, loginUser };
