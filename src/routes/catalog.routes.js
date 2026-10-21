import { Router } from "express";
import validate from "../middleware/validate.middleware.js";
import {
    productListQuerySchema,
} from "../validations/catalog.validation.js";
import {
    getCategoryBySlug,
    getProductBySlug,
    listCategories,
    listProducts,
} from "../controllers/catalog.controller.js";

const categoryRouter = Router();
const productRouter = Router();

categoryRouter.get("/", listCategories);
categoryRouter.get("/:slug", getCategoryBySlug);

productRouter.get("/", validate(productListQuerySchema, "query"), listProducts);
productRouter.get("/:slug", getProductBySlug);

export { categoryRouter, productRouter };
