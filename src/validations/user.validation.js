
import Joi from "joi";

const email = Joi.string().trim().lowercase().email().max(254);

const phone = Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .messages({
        "string.pattern.base":
            "Phone number must be a valid 10-digit Indian mobile number.",
    });

export const updateAccountDetailsSchema = Joi.object({
    fullName: Joi.string().trim().min(2).max(80),

    email,

    phone,
})
    .min(1)
    .unknown(false)
    .messages({
        "object.min": "At least one field is required for update.",
        "object.unknown": "Unknown field is not allowed.",
    });
