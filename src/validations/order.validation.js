import Joi from "joi";

export const createOrderSchema = Joi.object({
    addressId: Joi.string().hex().length(24).required(),
    paymentMethod: Joi.string().valid("cod").default("cod"),
}).unknown(false);

export const orderParamsSchema = Joi.object({
    orderId: Joi.string().hex().length(24).required(),
}).unknown(false);
