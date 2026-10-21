import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as cartService from "../services/cart.service.js";

const getCurrentCart = asyncHandler(async (req, res) => {
    const cart = await cartService.getCurrentCart(req.user._id);
    res.status(200).json(
        new ApiResponse(200, { cart }, "Cart fetched successfully.")
    );
});

const addCartItem = asyncHandler(async (req, res) => {
    const cart = await cartService.addCartItem(
        req.user._id,
        req.body.productId,
        req.body.quantity
    );

    res.status(200).json(
        new ApiResponse(200, { cart }, "Product added to cart successfully.")
    );
});

const updateCartItem = asyncHandler(async (req, res) => {
    const cart = await cartService.updateCartItem(
        req.user._id,
        req.params.productId,
        req.body.quantity
    );

    res.status(200).json(
        new ApiResponse(200, { cart }, "Cart quantity updated successfully.")
    );
});

const removeCartItem = asyncHandler(async (req, res) => {
    const cart = await cartService.removeCartItem(
        req.user._id,
        req.params.productId
    );

    res.status(200).json(
        new ApiResponse(200, { cart }, "Cart item removed successfully.")
    );
});

export { addCartItem, getCurrentCart, removeCartItem, updateCartItem };
