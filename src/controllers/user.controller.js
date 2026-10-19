
import * as userService from "../services/user.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getCurrentUser = asyncHandler(async (req, res) => {
    
    const userInfo = await userService.getCurrentUser({
        userId: req.user._id,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            userInfo,
            "Current user fetched successfully."
        )
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const updatedUser = await userService.updateAccountDetails({
        userId: req.user._id,
        body: req.body,
        file: req.file,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser,
            "Account details updated successfully."
        )
    );
});

export {
    getCurrentUser,
    updateAccountDetails,
};
