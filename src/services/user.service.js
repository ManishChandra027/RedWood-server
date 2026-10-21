import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudenary.js";
import * as authService from "./auth.service.js";
import { getDefaultAddressForUser } from "./address.service.js";
import { logServiceError } from "../utils/logger.js";

const getCurrentUser = async ({ userId }) => {
    const user = await User.findById(userId).select(
        "fullName email phone avatar role isVerified isPhoneVerified"
    );

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    const defaultAddress = await getDefaultAddressForUser(userId);

    return { user, defaultAddress };
};

const updateAccountDetails = async ({ userId, body, file }) => {
    const { email, fullName, phone } = body;

    if (
        email === undefined &&
        fullName === undefined &&
        phone === undefined &&
        !file
    ) {
        throw new ApiError(400, "At least one field is required for update.");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    // Track changes that need follow-up actions.
    let emailChanged = false;
    let newAvatar = null;
    let oldAvatarPublicId = null;

    // FULL NAME
    if (fullName !== undefined) {
        const normalizedName = fullName.trim();

        if (!normalizedName) {
            throw new ApiError(400, "Full name cannot be empty.");
        }

        if (normalizedName === user.fullName) {
            throw new ApiError(
                400,
                "New full name must be different from the current one."
            );
        }

        user.fullName = normalizedName;
    }

    // EMAIL
    if (email !== undefined) {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            throw new ApiError(400, "Email cannot be empty.");
        }

        if (normalizedEmail !== user.email.toLowerCase()) {
            const existingUser = await User.findOne({
                email: normalizedEmail,
                _id: { $ne: user._id },
            });

            if (existingUser) {
                throw new ApiError(
                    409,
                    "An account with this email already exists."
                );
            }

            user.email = normalizedEmail;
            user.isVerified = false;

            // Invalidate verification OTP for the previous email.
            user.emailVerificationOtp = undefined;
            user.emailVerificationExpires = undefined;

            emailChanged = true;
        }
    }

    // PHONE
    if (phone !== undefined) {
        const normalizedPhone = phone.trim();

        if (!normalizedPhone) {
            throw new ApiError(400, "Phone number cannot be empty.");
        }

        if (normalizedPhone !== user.phone) {
            const existingUser = await User.findOne({
                phone: normalizedPhone,
                _id: { $ne: user._id },
            });

            if (existingUser) {
                throw new ApiError(
                    409,
                    "An account with this phone number already exists."
                );
            }

            user.phone = normalizedPhone;
            user.isPhoneVerified = false;
        }
    }

    try {
        // AVATAR
        if (file) {
            const uploaded = await uploadOnCloudinary(file.path, {
                mimeType: file.mimetype,
                folder: "RareWolf/avatars",
            });

            if (!uploaded?.url || !uploaded?.public_id) {
                throw new ApiError(502, "Failed to upload avatar image.");
            }

            newAvatar = uploaded;
            oldAvatarPublicId = user.avatar?.public_id;

            user.avatar = {
                url: uploaded.url,
                public_id: uploaded.public_id,
            };
        }

        await user.save();
    } catch (error) {
        // Prevent orphaned new images if saving the user fails.
        if (newAvatar?.public_id) {
            try {
                await deleteFromCloudinary(newAvatar.public_id);
            } catch (cleanupError) {
                logServiceError("user.new_avatar_cleanup_failed", cleanupError);
            }
        }

        throw error;
    }

    // Delete the old avatar only after the new avatar is saved.
    if (newAvatar && oldAvatarPublicId) {
        try {
            await deleteFromCloudinary(oldAvatarPublicId);
        } catch (error) {
            // The account update succeeded; log cleanup failure separately.
            logServiceError("user.old_avatar_cleanup_failed", error);
        }
    }

    // Request verification for the new email.
    // If email delivery fails, the email remains unverified and can be retried.
    if (emailChanged) {
        try {
            await authService.requestEmailVerification(user._id);
        } catch (error) {
            logServiceError("user.email_verification_request_failed", error);
        }
    }

    // Return only safe account fields.
    const updatedUser = await User.findById(user._id).select(
        "fullName email phone avatar role isVerified isPhoneVerified"
    );

    return updatedUser;
};

export { getCurrentUser, updateAccountDetails };
