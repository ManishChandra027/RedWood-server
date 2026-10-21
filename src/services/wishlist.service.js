import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Wishlist from "../models/wishlist.model.js";
import ApiError from "../utils/ApiError.js";
import { toProductResponse } from "./catalog.service.js";

const getWishlistProducts = async (userId) => {
    const wishlist = await Wishlist.findOne({ user: userId }).populate({
        path: "products",
        match: { isActive: true },
        populate: { path: "category", match: { isActive: true }, select: "name slug image" },
    });

    return (wishlist?.products || [])
        .filter((product) => product?.category)
        .map(toProductResponse);
};

const addWishlistProduct = async (userId, productId) => {
    const product = await Product.findOne({ _id: productId, isActive: true }).select("_id category");
    if (!product) throw new ApiError(404, "Product not found or unavailable.");

    const category = await Category.exists({ _id: product.category, isActive: true });
    if (!category) throw new ApiError(404, "Product not found or unavailable.");

    try {
        await Wishlist.findOneAndUpdate(
            { user: userId },
            { $addToSet: { products: product._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        if (error.code !== 11000) throw error;
        await Wishlist.updateOne({ user: userId }, { $addToSet: { products: product._id } });
    }

    return getWishlistProducts(userId);
};

const removeWishlistProduct = async (userId, productId) => {
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) throw new ApiError(404, "Saved product not found.");

    const originalCount = wishlist.products.length;
    wishlist.products = wishlist.products.filter((savedProductId) => !savedProductId.equals(productId));
    if (wishlist.products.length === originalCount) {
        throw new ApiError(404, "Saved product not found.");
    }

    await wishlist.save();
    return getWishlistProducts(userId);
};

export { addWishlistProduct, getWishlistProducts, removeWishlistProduct };
