import { Router } from "express";

import {
    cancelMyOrder,
    createOrder,
    getMyOrder,
    getMyOrders,
} from "../controllers/order.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { createOrderSchema, orderParamsSchema } from "../validations/order.validation.js";

const router = Router();

router.use(verifyJwt);
router.post("/", validate(createOrderSchema), createOrder);
router.get("/", getMyOrders);
router.get("/:orderId", validate(orderParamsSchema, "params"), getMyOrder);
router.post("/:orderId/cancel", validate(orderParamsSchema, "params"), cancelMyOrder);

export default router;
