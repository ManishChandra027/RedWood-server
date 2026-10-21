import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as addressService from "../services/address.service.js";

const listAddresses = asyncHandler(async (req, res) => {
    const data = await addressService.listAddresses(req.user._id);
    res.status(200).json(
        new ApiResponse(200, data, "Addresses fetched successfully.")
    );
});

const createAddress = asyncHandler(async (req, res) => {
    const address = await addressService.createAddress(req.user._id, req.body);
    res.status(201).json(
        new ApiResponse(201, { address }, "Address added successfully.")
    );
});

const updateAddress = asyncHandler(async (req, res) => {
    const address = await addressService.updateAddress(
        req.user._id,
        req.params.addressId,
        req.body
    );
    res.status(200).json(
        new ApiResponse(200, { address }, "Address updated successfully.")
    );
});

const deleteAddress = asyncHandler(async (req, res) => {
    const address = await addressService.deleteAddress(
        req.user._id,
        req.params.addressId
    );
    res.status(200).json(
        new ApiResponse(200, { address }, "Address deleted successfully.")
    );
});

export { createAddress, deleteAddress, listAddresses, updateAddress };
