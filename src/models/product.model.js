import { Schema, model } from "mongoose";

const productImageSchema = new Schema(
    {
        url: { type: String, required: true, trim: true },
        alt: { type: String, trim: true, default: "" },
        public_id: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const productSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 160,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 5000,
        },
        price: { type: Number, required: true, min: 0 },
        mrp: { type: Number, min: 0 },
        rating: { type: Number, min: 0, max: 5, default: 0 },
        images: {
            type: [productImageSchema],
            validate: {
                validator: (images) => images.length > 0,
                message: "At least one product image is required.",
            },
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
            index: true,
        },
        stock: { type: Number, required: true, min: 0, default: 0 },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

productSchema.pre("validate", function validateMrp() {
    if (this.mrp !== undefined && this.mrp < this.price) {
        this.invalidate("mrp", "MRP must be greater than or equal to price.");
    }
});

productSchema.index({ isActive: 1, category: 1, price: 1 });
productSchema.index({ name: "text", description: "text" });

const Product = model("Product", productSchema);

export default Product;
