import Joi from "joi";

export const wishlistProductSchema = Joi.object({
    productId: Joi.string().hex().length(24).required(),
}).unknown(false);

export const cartItemParamsSchema = Joi.object({
    productId: Joi.string().hex().length(24).required(),
}).unknown(false);
