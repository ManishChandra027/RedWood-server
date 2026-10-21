import { Schema, model } from "mongoose";

const orderItemSchema = new Schema(
    {
        product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, trim: true },
        image: { type: String, default: "" },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        lineTotal: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const deliveryAddressSchema = new Schema(
    {
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        addressLine1: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pinCode: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const orderSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        items: { type: [orderItemSchema], required: true, validate: (items) => items.length > 0 },
        deliveryAddress: { type: deliveryAddressSchema, required: true },
        subtotal: { type: Number, required: true, min: 0 },
        shippingAmount: { type: Number, required: true, min: 0, default: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        paymentMethod: { type: String, enum: ["cod"], required: true, default: "cod" },
        paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
        status: {
            type: String,
            enum: ["placed", "processing", "shipped", "delivered", "cancelled"],
            default: "placed",
            index: true,
        },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });

const Order = model("Order", orderSchema);

export default Order;
