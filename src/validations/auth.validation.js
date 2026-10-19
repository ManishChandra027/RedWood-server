import Joi from "joi";

const email = Joi.string().trim().lowercase().email().max(254);

const password = Joi.string().min(8).max(128);

const otp = Joi.string()
    .pattern(/^\d{6}$/)
    .messages({
        "string.pattern.base": "OTP must be exactly 6 digits.",
    });

export const registerSchema = Joi.object({
    fullName: Joi.string().trim().min(2).max(80).required(),
    email: email.required(),
    password: password.required(),
});

export const loginSchema = Joi.object({
    identifier: Joi.string().lowercase().trim().required(),
    password: Joi.string().required(),
});

export const updatePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    updatedPassword: password.required(),
}).unknown(false);

export const forgotPasswordSchema = Joi.object({
    email: email.required(),
});

export const verifyPasswordResetOtpSchema = Joi.object({
    email: email.required(),
    otp: otp.required(),
});

export const resetPasswordSchema = Joi.object({
    newPassword: password.required(),
});

export const verifyEmailSchema = Joi.object({
    email: email.required(),
    otp: otp.required(),
});
