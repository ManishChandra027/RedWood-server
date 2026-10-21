import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as wishlistService from "../services/wishlist.service.js";

const getWishlist = asyncHandler(async (req, res) => {
    const products = await wishlistService.getWishlistProducts(req.user._id);
    res.status(200).json(new ApiResponse(200, { products }, "Wishlist fetched successfully."));
});

const addWishlistProduct = asyncHandler(async (req, res) => {
    const products = await wishlistService.addWishlistProduct(req.user._id, req.body.productId);
    res.status(200).json(new ApiResponse(200, { products }, "Product saved successfully."));
});

const removeWishlistProduct = asyncHandler(async (req, res) => {
    const products = await wishlistService.removeWishlistProduct(req.user._id, req.params.productId);
    res.status(200).json(new ApiResponse(200, { products }, "Product removed from saved items."));
});

export { addWishlistProduct, getWishlist, removeWishlistProduct };
