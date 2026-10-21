import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import * as adminOperationsService from "../services/adminOperations.service.js";

const listLowStockProducts = asyncHandler(async (req, res) => {
    const result = await adminOperationsService.listLowStockProducts(req.validated.query);
    return res.status(200).json(new ApiResponse(200, result, "Low-stock products fetched successfully."));
});

const adjustProductStock = asyncHandler(async (req, res) => {
    const product = await adminOperationsService.adjustProductStock(
        req.validated.params.productId,
        req.validated.body.adjustment,
    );
    return res.status(200).json(new ApiResponse(200, { product }, "Product stock adjusted successfully."));
});

const listOrders = asyncHandler(async (req, res) => {
    const result = await adminOperationsService.listAdminOrders(req.validated.query);
    return res.status(200).json(new ApiResponse(200, result, "Admin orders fetched successfully."));
});

const getOrder = asyncHandler(async (req, res) => {
    const order = await adminOperationsService.getAdminOrder(req.validated.params.orderId);
    return res.status(200).json(new ApiResponse(200, { order }, "Admin order fetched successfully."));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
    const order = await adminOperationsService.updateAdminOrderStatus(
        req.validated.params.orderId,
        req.validated.body.status,
    );
    return res.status(200).json(new ApiResponse(200, { order }, "Order status updated successfully."));
});

export { adjustProductStock, getOrder, listLowStockProducts, listOrders, updateOrderStatus };
