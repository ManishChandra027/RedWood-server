import Cart from "../models/cart.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";

const getCurrentCart = async (userId) => {
    const cart = await Cart.findOne({ user: userId }).populate({
        path: "items.product",
        select: "name slug price mrp rating images stock isActive",
    });

    return cart;
};

const populateCartProducts = async (cart) => {
    await cart.populate({
        path: "items.product",
        select: "name slug price mrp rating images stock isActive",
    });
    return cart;
};

const getAvailableProduct = async (productId) => {
    const product = await Product.findOne({
        _id: productId,
        isActive: true,
    }).select("stock category");

    if (!product) {
        throw new ApiError(404, "Product not found or unavailable.");
    }

    const category = await Category.findOne({
        _id: product.category,
        isActive: true,
    }).select("_id");

    if (!category) {
        throw new ApiError(404, "Product not found or unavailable.");
    }

    return product;
};

const addCartItem = async (userId, productId, quantity) => {
    const product = await getAvailableProduct(productId);

    if (product.stock < quantity) {
        throw new ApiError(409, "Requested quantity is not available in stock.");
    }

    let cart = await Cart.findOne({ user: userId });
    let createdNewCart = false;

    if (!cart) {
        try {
            cart = await Cart.create({
                user: userId,
                items: [{ product: product._id, quantity }],
            });
            createdNewCart = true;
        } catch (error) {
            if (error.code !== 11000) throw error;
            cart = await Cart.findOne({ user: userId });
        }
    }

    if (!cart) {
        throw new ApiError(500, "Unable to create the shopping cart.");
    }

    const existingItem = cart.items.find((item) =>
        item.product.equals(product._id)
    );

    if (!createdNewCart) {
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.stock) {
                throw new ApiError(
                    409,
                    "Requested quantity is not available in stock."
                );
            }
            existingItem.quantity = newQuantity;
        } else {
            cart.items.push({ product: product._id, quantity });
        }
        await cart.save();
    }

    return populateCartProducts(cart);
};

const updateCartItem = async (userId, productId, quantity) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart item not found.");

    const item = cart.items.find((cartItem) =>
        cartItem.product.equals(productId)
    );
    if (!item) throw new ApiError(404, "Cart item not found.");

    const product = await getAvailableProduct(productId);
    if (quantity > product.stock) {
        throw new ApiError(409, "Requested quantity is not available in stock.");
    }

    item.quantity = quantity;
    await cart.save();
    return populateCartProducts(cart);
};

const removeCartItem = async (userId, productId) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart item not found.");

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
        (item) => !item.product.equals(productId)
    );
    if (cart.items.length === initialLength) {
        throw new ApiError(404, "Cart item not found.");
    }

    await cart.save();
    return populateCartProducts(cart);
};

export { addCartItem, getCurrentCart, removeCartItem, updateCartItem };
