import Joi from "joi";

const fullName = Joi.string().trim().min(2).max(80);
const phone = Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .messages({
        "string.pattern.base":
            "Phone number must be a valid 10-digit Indian mobile number.",
    });
const addressLine1 = Joi.string().trim().min(3).max(200);
const city = Joi.string().trim().min(2).max(100);
const state = Joi.string().trim().min(2).max(100);
const pinCode = Joi.string()
    .trim()
    .pattern(/^[1-9]\d{5}$/)
    .messages({
        "string.pattern.base": "PIN code must be a valid 6-digit Indian PIN code.",
    });
const country = Joi.string().trim().min(2).max(80);

export const createAddressSchema = Joi.object({
    fullName: fullName.required(),
    phone: phone.required(),
    addressLine1: addressLine1.required(),
    city: city.required(),
    state: state.required(),
    pinCode: pinCode.required(),
    country: country.default("India"),
    isDefault: Joi.boolean().default(false),
})
    .unknown(false)
    .messages({
        "object.unknown": "Unknown field is not allowed.",
    });

export const updateAddressSchema = Joi.object({
    fullName,
    phone,
    addressLine1,
    city,
    state,
    pinCode,
    country,
    isDefault: Joi.boolean(),
})
    .min(1)
    .unknown(false)
    .messages({
        "object.min": "At least one field is required for update.",
        "object.unknown": "Unknown field is not allowed.",
    });
