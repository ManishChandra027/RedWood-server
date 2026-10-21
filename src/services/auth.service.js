import User from "../models/user.model.js";
import generateOtp from "../utils/generateOtp.js";
import generateTemporaryToken from "../utils/generateTemporaryToken.js";
import { createHash } from "node:crypto";
import sendEmail from "../utils/sendEmail.js";
import { logServiceError } from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId).select("+refreshToken");

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return {
            accessToken,
            refreshToken,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            500,
            "Something went wrong while generating authentication tokens"
        );
    }
};

const registerUser = async ({ email, password, fullName }) => {
    const isUserExist = await User.findOne({
        email,
    });

    if (isUserExist) {
        throw new ApiError(
            409,
            "A user with this email or username already exists."
        );
    }

    const userData = {
        fullName,
        email,
        password,
    };

    const user = await User.create(userData);

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const registeredUser = await User.findById(user._id);

    if (!registeredUser) {
        throw new ApiError(500, "Registration failed. Please try again.");
    }
    try {
        await requestEmailVerification(user._id);
    } catch (error) {
        // Keep the account usable; the signed-in user can request another code.
        logServiceError("auth.registration_verification_email_failed", error);
    }

    return {
        user: registeredUser,
        accessToken,
        refreshToken,
    };
};

const loginUser = async ({ query, password }) => {
    const user = await User.findOne(query).select("+password");

    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordValid = await user.isPasswordValid(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "fullName email phone avatar role isVerified isPhoneVerified"
    );

    if (!loggedInUser) {
        throw new ApiError(500, "Unable to log in. Please try again.");
    }

    return {
        user: loggedInUser,
        accessToken,
        refreshToken,
    };
};

const logoutUser = async (userId) => {
    await User.findByIdAndUpdate(userId, {
        $unset: {
            refreshToken: 1,
        },
    });
};


const refreshAccessToken = async (userId) => {
    if (!userId) {
        throw new ApiError(400, "User ID is required to refresh access token");
    }
    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(userId);

    return {
        accessToken,
        refreshToken,
    };
};

const updatePassword = async ({ userId, currentPassword, updatedPassword }) => {
    if (currentPassword === updatedPassword) {
        throw new ApiError(
            401,
            "Current password and new password should not be same"
        );
    }

    const user = await User.findById(userId).select("+password +refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isCurrentPasswordValid = await user.isPasswordValid(currentPassword);

    if (!isCurrentPasswordValid) {
        throw new ApiError(401, "Current password is incorrect");
    }

    user.password = updatedPassword;
    user.refreshToken = undefined;
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save({
        validateBeforeSave: false,
    });
};

const forgotPassword = async (email) => {
    
    

    const user = await User.findOne({ email });

    // Do not reveal whether an email is registered.
    if (!user) {
        return;
    }

    const otp = generateOtp();

    user.passwordResetOtp = otp;
    user.passwordResetOtpExpires = Date.now() + 10 * 60 * 1000;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save();

    try {
        await sendEmail({
            to: user.email,
            subject: "OTP to Reset Your Password",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                ">
                    <h2>Reset Your Password</h2>

                    <p>
                        We received a request to reset your
                        RareWolf password.
                    </p>

                    <p>Your password reset OTP is:</p>

                    <div style="
                        font-size: 28px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        padding: 12px 0;
                    ">
                        ${otp}
                    </div>

                    <p>This OTP expires in 10 minutes.</p>

                    <p>
                        If you did not request a password reset,
                        you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (emailError) {
        user.passwordResetOtp = undefined;
        user.passwordResetOtpExpires = undefined;

        await user.save({ validateBeforeSave: false });

        logServiceError("auth.password_reset_email_failed", emailError);

        throw new ApiError(
            500,
            "Unable to send the email at the moment. Please try again later."
        );
    }
};

const verifyPasswordResetOtp = async ({ email, otp }) => {
   

    const user = await User.findOne({
        email: email.trim().toLowerCase(),
        passwordResetOtp: otp,
        passwordResetOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired password reset OTP.");
    }

    const { rawToken, hashedToken } = generateTemporaryToken();

    user.passwordResetToken = hashedToken;
    user.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;

    await user.save();

    return rawToken;
};

const resetPassword = async ({ rawToken, newPassword }) => {
    if (!rawToken) {
        throw new ApiError(400, "Reset token  are required.");
    }

    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpires: {
            $gt: Date.now(),
        },
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired password reset token.");
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.refreshToken = undefined;

    await user.save();

    return true;
};

const requestEmailVerification = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    if (user.isVerified) {
        throw new ApiError(400, "Email is already verified.");
    }

    const otp = generateOtp();

    user.emailVerificationOtp = otp;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    try {
        await sendEmail({
            to: user.email,
            subject: "Verify Your Email Address",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                ">
                    <h2>Email Verification</h2>

                    <p>
                        Thank you for registering on RareWolf.
                        Use the OTP below to verify your email address.
                    </p>

                    <div style="
                        font-size: 28px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        padding: 12px 0;
                    ">
                        ${otp}
                    </div>

                    <p>This OTP expires in 10 minutes.</p>

                    <p>
                        If you did not create this account,
                        you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (emailError) {
        user.emailVerificationOtp = undefined;
        user.emailVerificationExpires = undefined;

        await user.save({ validateBeforeSave: false });

        logServiceError("auth.email_verification_failed", emailError);

        throw new ApiError(
            500,
            "Unable to send the email at the moment. Please try again later."
        );
    }
};

const verifyEmail = async ({ userId, email, otp }) => {

    const user = await User.findOne({
        _id: userId,
        email: email.trim().toLowerCase(),
        emailVerificationOtp: otp,
        emailVerificationExpires: {
            $gt: Date.now(),
        },
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired email verification OTP.");
    }

    user.isVerified = true;
    user.emailVerificationOtp = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return true;
};

export {
    registerUser,
    loginUser,
    logoutUser,
    updatePassword,
    forgotPassword,
    verifyPasswordResetOtp,
    resetPassword,
    requestEmailVerification,
    verifyEmail,
    refreshAccessToken,
};
