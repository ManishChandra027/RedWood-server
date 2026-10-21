import { Schema, model } from "mongoose";

const addressSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        addressLine1: {
            type: String,
            required: true,
            trim: true,
        },

        city: {
            type: String,
            required: true,
            trim: true,
        },

        state: {
            type: String,
            required: true,
            trim: true,
        },

        pinCode: {
            type: String,
            required: true,
            trim: true,
        },

        country: {
            type: String,
            default: "India",
        },

        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

addressSchema.index(
    { user: 1 },
    {
        unique: true,
        partialFilterExpression: { isDefault: true },
        name: "one_default_address_per_user",
    }
);

export const Address = model("Address", addressSchema);
