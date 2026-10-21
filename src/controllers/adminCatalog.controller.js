import fs from "node:fs/promises";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import * as adminCatalogService from "../services/adminCatalog.service.js";
import {
    adminCategoryCreateSchema,
    adminCategoryUpdateSchema,
    adminProductCreateSchema,
    adminProductUpdateSchema,
} from "../validations/admin.validation.js";

const validateInput = (schema, input) => {
    const { error, value } = schema.validate(input, { abortEarly: false, convert: true });
    if (error) {
        throw new ApiError(400, error.details.map((detail) => detail.message).join(", "));
    }
    return value;
};

const cleanupFiles = async (files = []) => {
    await Promise.all(files.map(async ({ path }) => {
        try {
            await fs.unlink(path);
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }));
};

const listProducts = asyncHandler(async (req, res) => {
    const result = await adminCatalogService.listAdminProducts(req.validated.query);
    return res.status(200).json(new ApiResponse(200, result, "Admin products fetched successfully."));
});

const getProduct = asyncHandler(async (req, res) => {
    const product = await adminCatalogService.getAdminProduct(req.validated.params.productId);
    return res.status(200).json(new ApiResponse(200, { product }, "Admin product fetched successfully."));
});

const createProduct = asyncHandler(async (req, res) => {
    try {
        const data = validateInput(adminProductCreateSchema, req.body);
        const product = await adminCatalogService.createAdminProduct({ data, files: req.files });
        return res.status(201).json(new ApiResponse(201, { product }, "Product created successfully."));
    } finally {
        await cleanupFiles(req.files);
    }
});

const updateProduct = asyncHandler(async (req, res) => {
    try {
        const hasBodyChanges = Object.keys(req.body || {}).length > 0;
        const data = hasBodyChanges
            ? validateInput(adminProductUpdateSchema, req.body)
            : {};
        if (!Object.keys(data).length && !req.files?.length) {
            throw new ApiError(400, "Provide product changes or replacement images.");
        }
        const product = await adminCatalogService.updateAdminProduct({
            productId: req.validated.params.productId,
            data,
            files: req.files,
        });
        return res.status(200).json(new ApiResponse(200, { product }, "Product updated successfully."));
    } finally {
        await cleanupFiles(req.files);
    }
});

const deactivateProduct = asyncHandler(async (req, res) => {
    const product = await adminCatalogService.deactivateAdminProduct(req.validated.params.productId);
    return res.status(200).json(new ApiResponse(200, { product }, "Product deactivated successfully."));
});

const listCategories = asyncHandler(async (req, res) => {
    const result = await adminCatalogService.listAdminCategories(req.validated.query);
    return res.status(200).json(new ApiResponse(200, result, "Admin categories fetched successfully."));
});

const getCategory = asyncHandler(async (req, res) => {
    const category = await adminCatalogService.getAdminCategory(req.validated.params.categoryId);
    return res.status(200).json(new ApiResponse(200, { category }, "Admin category fetched successfully."));
});

const createCategory = asyncHandler(async (req, res) => {
    const data = validateInput(adminCategoryCreateSchema, req.body);
    const category = await adminCatalogService.createAdminCategory(data);
    return res.status(201).json(new ApiResponse(201, { category }, "Category created successfully."));
});

const updateCategory = asyncHandler(async (req, res) => {
    const data = validateInput(adminCategoryUpdateSchema, req.body);
    const category = await adminCatalogService.updateAdminCategory(req.validated.params.categoryId, data);
    return res.status(200).json(new ApiResponse(200, { category }, "Category updated successfully."));
});

const deactivateCategory = asyncHandler(async (req, res) => {
    const category = await adminCatalogService.deactivateAdminCategory(req.validated.params.categoryId);
    return res.status(200).json(new ApiResponse(200, { category }, "Category deactivated successfully."));
});

export {
    createCategory,
    createProduct,
    deactivateCategory,
    deactivateProduct,
    getCategory,
    getProduct,
    listCategories,
    listProducts,
    updateCategory,
    updateProduct,
};
