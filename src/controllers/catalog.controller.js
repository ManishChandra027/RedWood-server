import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as catalogService from "../services/catalog.service.js";

const listCategories = asyncHandler(async (req, res) => {
    const categories = await catalogService.listCategories();
    res.status(200).json(
        new ApiResponse(200, { categories }, "Categories fetched successfully.")
    );
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
    const category = await catalogService.getCategoryBySlug(req.params.slug);
    res.status(200).json(
        new ApiResponse(200, { category }, "Category fetched successfully.")
    );
});

const listProducts = asyncHandler(async (req, res) => {
    const result = await catalogService.listProducts(req.validated?.query ?? req.query);
    res.status(200).json(new ApiResponse(200, result, "Products fetched successfully."));
});

const getProductBySlug = asyncHandler(async (req, res) => {
    const product = await catalogService.getProductBySlug(req.params.slug);
    res.status(200).json(
        new ApiResponse(200, { product }, "Product fetched successfully.")
    );
});

export { getCategoryBySlug, getProductBySlug, listCategories, listProducts };
