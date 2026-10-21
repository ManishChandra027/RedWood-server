import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import ApiError from "../utils/ApiError.js";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const destination = "./public/temp";
        fs.mkdir(destination, { recursive: true }, (error) => cb(error, destination));
    },

    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        const ext = path.extname(file.originalname).toLowerCase();

        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        return cb(null, true);
    }

    cb(new ApiError(400, "Only JPEG, PNG, and WebP images are allowed."));
};

export const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
        files: 5, // Maximum 5 files per request
    },

    fileFilter,
});
