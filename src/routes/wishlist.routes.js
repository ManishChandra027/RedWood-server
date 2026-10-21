import { Router } from "express";

import {
    addWishlistProduct,
    getWishlist,
    removeWishlistProduct,
} from "../controllers/wishlist.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { cartItemParamsSchema, wishlistProductSchema } from "../validations/wishlist.validation.js";

const router = Router();
router.use(verifyJwt);
router.get("/", getWishlist);
router.post("/items", validate(wishlistProductSchema), addWishlistProduct);
router.delete("/items/:productId", validate(cartItemParamsSchema, "params"), removeWishlistProduct);

export default router;
