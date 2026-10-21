import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { cancelAdminOrder } from "./order.service.js";
import ApiError from "../utils/ApiError.js";

const paginationFor = (total, page, limit) => {
    const pages = Math.ceil(total / limit);
    return {
        total,
        page,
        limit,
        pages,
        hasNextPage: page < pages,
        hasPreviousPage: page > 1,
    };
};

const adjustProductStock = async (productId, adjustment) => {
    const filter = { _id: productId };
    if (adjustment < 0) filter.stock = { $gte: Math.abs(adjustment) };

    const product = await Product.findOneAndUpdate(
        filter,
        { $inc: { stock: adjustment } },
        { new: true, runValidators: true },
    );
    if (!product) {
        const exists = await Product.exists({ _id: productId });
        if (!exists) throw new ApiError(404, "Product not found.");
        throw new ApiError(409, "Stock is too low for this adjustment.");
    }
    return product;
};

const listLowStockProducts = async ({ threshold = 5, page = 1, limit = 20 }) => {
    const filter = { stock: { $lte: threshold } };
    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate("category", "name slug isActive")
            .sort({ stock: 1, name: 1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Product.countDocuments(filter),
    ]);
    return { products, pagination: paginationFor(total, page, limit), threshold };
};

const orderPopulate = { path: "user", select: "fullName email" };

const listAdminOrders = async ({ status = "all", page = 1, limit = 20 }) => {
    const filter = status === "all" ? {} : { status };
    const [orders, total] = await Promise.all([
        Order.find(filter)
            .populate(orderPopulate)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Order.countDocuments(filter),
    ]);
    return { orders, pagination: paginationFor(total, page, limit) };
};

const getAdminOrder = async (orderId) => {
    const order = await Order.findById(orderId).populate(orderPopulate).lean();
    if (!order) throw new ApiError(404, "Order not found.");
    return order;
};

const transitions = {
    processing: ["placed"],
    shipped: ["processing"],
    delivered: ["shipped"],
};

const updateAdminOrderStatus = async (orderId, status) => {
    if (status === "cancelled") return cancelAdminOrder(orderId);

    const allowedPreviousStatuses = transitions[status];
    if (!allowedPreviousStatuses) throw new ApiError(400, "Unsupported order status transition.");

    const order = await Order.findOneAndUpdate(
        { _id: orderId, status: { $in: allowedPreviousStatuses } },
        { $set: { status } },
        { new: true, runValidators: true },
    );
    if (!order) {
        const exists = await Order.exists({ _id: orderId });
        if (!exists) throw new ApiError(404, "Order not found.");
        throw new ApiError(409, "This order cannot move to the requested status.");
    }
    return order;
};

export {
    adjustProductStock,
    getAdminOrder,
    listAdminOrders,
    listLowStockProducts,
    updateAdminOrderStatus,
};
