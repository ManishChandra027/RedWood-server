import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as orderService from "../services/order.service.js";

const createOrder = asyncHandler(async (req, res) => {
    const order = await orderService.createOrderFromCart(
        req.user._id,
        req.body.addressId
    );
    res.status(201).json(new ApiResponse(201, { order }, "Order placed successfully."));
});

const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await orderService.getUserOrders(req.user._id);
    res.status(200).json(new ApiResponse(200, { orders }, "Orders fetched successfully."));
});

const getMyOrder = asyncHandler(async (req, res) => {
    const order = await orderService.getUserOrder(req.user._id, req.params.orderId);
    res.status(200).json(new ApiResponse(200, { order }, "Order fetched successfully."));
});

const cancelMyOrder = asyncHandler(async (req, res) => {
    const order = await orderService.cancelUserOrder(req.user._id, req.params.orderId);
    res.status(200).json(new ApiResponse(200, { order }, "Order cancelled successfully."));
});

export { cancelMyOrder, createOrder, getMyOrder, getMyOrders };
