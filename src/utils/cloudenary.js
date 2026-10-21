import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs/promises";
import ApiError from "./ApiError.js";
import { logServiceError } from "./logger.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const uploadOnCloudinary = async (
    localFilePath,
    { mimeType, folder = "assets" } = {}
) => {
    if (!localFilePath) {
        throw new ApiError(400, "Local file path is required.");
    }

    try {
        if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
            throw new ApiError(400, "Unsupported image format.");
        }

        const fileStats = await fs.stat(localFilePath);

        if (!fileStats.isFile()) {
            throw new ApiError(400, "Invalid file.");
        }

        if (fileStats.size > MAX_FILE_SIZE) {
            throw new ApiError(413, "Image must not exceed 5 MB.");
        }

        const result = await cloudinary.uploader.upload(localFilePath, {
            folder,
            resource_type: "image",
            timeout: 60_000,
        });

        return {
            url: result.secure_url,
            public_id: result.public_id,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        logServiceError("cloudinary.upload_failed", error);

        throw new ApiError(502, "Image upload failed. Please try again later.");
    } finally {
        // Cleanup failure should not hide the original upload error.
        try {
            await fs.unlink(localFilePath);
        } catch (error) {
            if (error.code !== "ENOENT") {
                logServiceError("cloudinary.temporary_file_cleanup_failed", error);
            }
        }
    }
};

export const deleteFromCloudinary = async (publicId) => {
    if (!publicId) {
        throw new ApiError(400, "Cloudinary public ID is required.");
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
        });

        if (result.result !== "ok" && result.result !== "not found") {
            throw new Error("Cloudinary could not delete the image.");
        }

        return result;
    } catch (error) {
        logServiceError("cloudinary.delete_failed", error);

        throw new ApiError(
            502,
            "Unable to delete the image. Please try again later."
        );
    }
};
