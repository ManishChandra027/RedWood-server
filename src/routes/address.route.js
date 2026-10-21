import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import {
    createAddressSchema,
    updateAddressSchema,
} from "../validations/address.validation.js";
import {
    createAddress,
    deleteAddress,
    listAddresses,
    updateAddress,
} from "../controllers/address.controller.js";

const router = Router();

router.use(verifyJwt);
router.get("/", listAddresses);
router.post("/", validate(createAddressSchema), createAddress);
router.patch("/:addressId", validate(updateAddressSchema), updateAddress);
router.delete("/:addressId", deleteAddress);

export default router;
