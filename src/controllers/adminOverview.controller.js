import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import * as adminOverviewService from "../services/adminOverview.service.js";

const getDashboard = asyncHandler(async (_req, res) => {
    const dashboard = await adminOverviewService.getAdminDashboard();
    return res.status(200).json(new ApiResponse(200, dashboard, "Admin dashboard fetched successfully."));
});

const listCustomers = asyncHandler(async (req, res) => {
    const result = await adminOverviewService.listAdminCustomers(req.validated.query);
    return res.status(200).json(new ApiResponse(200, result, "Customers fetched successfully."));
});

const listCustomerOrders = asyncHandler(async (req, res) => {
    const result = await adminOverviewService.listCustomerOrders(
        req.validated.params.customerId,
        req.validated.query,
    );
    return res.status(200).json(new ApiResponse(200, result, "Customer orders fetched successfully."));
});

export { getDashboard, listCustomerOrders, listCustomers };
