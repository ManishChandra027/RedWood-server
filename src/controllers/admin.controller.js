import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.model.js";

const getAdminProfile = asyncHandler(async (req, res) => {
    const admin = await User.findById(req.user._id)
        .select("fullName email role");

    return res.status(200).json(
        new ApiResponse(200, { admin }, "Admin profile fetched successfully.")
    );
});

export { getAdminProfile };
