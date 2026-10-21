import { Router } from "express";
import { getAdminProfile } from "../controllers/admin.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import requireAdmin from "../middleware/requireAdmin.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { upload } from "../middleware/multer.middlewares.js";
import {
    adminCategoryIdSchema,
    adminCategoryListSchema,
    adminProductIdSchema,
    adminProductListSchema,
    adminStockAdjustmentSchema,
    adminLowStockQuerySchema,
    adminOrderListSchema,
    adminOrderStatusSchema,
    adminOrderIdSchema,
    adminCustomerListSchema,
    adminCustomerIdSchema,
    adminCustomerOrdersQuerySchema,
} from "../validations/admin.validation.js";
import {
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
} from "../controllers/adminCatalog.controller.js";
import {
    adjustProductStock,
    getOrder,
    listLowStockProducts,
    listOrders,
    updateOrderStatus,
} from "../controllers/adminOperations.controller.js";
import { getDashboard, listCustomerOrders, listCustomers } from "../controllers/adminOverview.controller.js";

const router = Router();

router.use(verifyJwt, requireAdmin);
router.get("/me", getAdminProfile);
router.get("/dashboard", getDashboard);


router.get("/products", validate(adminProductListSchema, "query"), listProducts);
router.post("/products", upload.array("images", 5), createProduct);
router.get("/products/:productId", validate(adminProductIdSchema, "params"), getProduct);
router.patch(
    "/products/:productId",
    upload.array("images", 5),
    validate(adminProductIdSchema, "params"),
    updateProduct,
);

router.get("/customers", validate(adminCustomerListSchema, "query"), listCustomers);
router.get(
    "/customers/:customerId/orders",
    validate(adminCustomerIdSchema, "params"),
    validate(adminCustomerOrdersQuerySchema, "query"),
    listCustomerOrders,
);
router.delete("/products/:productId", validate(adminProductIdSchema, "params"), deactivateProduct);
router.patch(
    "/products/:productId/stock",
    validate(adminProductIdSchema, "params"),
    validate(adminStockAdjustmentSchema),
    adjustProductStock,
);
router.get("/inventory/low-stock", validate(adminLowStockQuerySchema, "query"), listLowStockProducts);

router.get("/categories", validate(adminCategoryListSchema, "query"), listCategories);
router.post("/categories", createCategory);
router.get("/categories/:categoryId", validate(adminCategoryIdSchema, "params"), getCategory);
router.patch("/categories/:categoryId", validate(adminCategoryIdSchema, "params"), updateCategory);
router.delete("/categories/:categoryId", validate(adminCategoryIdSchema, "params"), deactivateCategory);

router.get("/orders", validate(adminOrderListSchema, "query"), listOrders);
router.get("/orders/:orderId", validate(adminOrderIdSchema, "params"), getOrder);
router.patch(
    "/orders/:orderId/status",
    validate(adminOrderIdSchema, "params"),
    validate(adminOrderStatusSchema),
    updateOrderStatus,
);

export default router;
