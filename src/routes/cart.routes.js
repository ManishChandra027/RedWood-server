import { Router } from "express";
import {
    addCartItem,
    getCurrentCart,
    removeCartItem,
    updateCartItem,
} from "../controllers/cart.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import {
    addCartItemSchema,
    cartItemParamsSchema,
    updateCartItemSchema,
} from "../validations/catalog.validation.js";

const router = Router();

router.get("/", verifyJwt, getCurrentCart);
router.post("/items", verifyJwt, validate(addCartItemSchema), addCartItem);
router.patch(
    "/items/:productId",
    verifyJwt,
    validate(cartItemParamsSchema, "params"),
    validate(updateCartItemSchema),
    updateCartItem
);
router.delete(
    "/items/:productId",
    verifyJwt,
    validate(cartItemParamsSchema, "params"),
    removeCartItem
);

export default router;
