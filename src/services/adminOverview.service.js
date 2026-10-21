import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";

const LOW_STOCK_THRESHOLD = 5;
const CUSTOMER_FIELDS = "fullName email phone isVerified isPhoneVerified createdAt";
const paginationFor = (total, page, limit) => ({
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPreviousPage: page > 1,
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const orderSummary = (order) => ({
    _id: order._id,
    user: order.user,
    status: order.status,
    createdAt: order.createdAt,
    totalAmount: order.totalAmount,
    itemCount: (order.items || []).reduce((sum, item) => sum + item.quantity, 0),
});

const getAdminDashboard = async () => {
    const outstandingFilter = { status: { $in: ["placed", "processing"] } };
    const [productCount, customerCount, orderCount, outstandingCount, recentOrders, outstandingOrders, lowStockProducts] = await Promise.all([
        Product.countDocuments({ isActive: true }),
        User.countDocuments({ role: "user" }),
        Order.countDocuments({}),
        Order.countDocuments(outstandingFilter),
        Order.find({})
            .select("user status createdAt totalAmount items")
            .populate({ path: "user", select: "fullName email" })
            .sort({ createdAt: -1, _id: -1 })
            .limit(5)
            .lean(),
        Order.find(outstandingFilter)
            .select("user status createdAt totalAmount items")
            .populate({ path: "user", select: "fullName email" })
            .sort({ createdAt: -1, _id: -1 })
            .limit(5)
            .lean(),
        Product.find({ isActive: true, stock: { $lte: LOW_STOCK_THRESHOLD } })
            .select("name slug stock")
            .sort({ stock: 1, name: 1, _id: 1 })
            .limit(5)
            .lean(),
    ]);

    return {
        counts: { activeProducts: productCount, customers: customerCount, orders: orderCount, outstandingOrders: outstandingCount },
        recentOrders: recentOrders.map(orderSummary),
        outstandingOrders: outstandingOrders.map(orderSummary),
        lowStockProducts,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
    };
};

const listAdminCustomers = async ({ search = "", page = 1, limit = 20 }) => {
    const filter = { role: "user" };
    if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ fullName: pattern }, { email: pattern }, { phone: pattern }];
    }
    const [customers, total] = await Promise.all([
        User.find(filter)
            .select(CUSTOMER_FIELDS)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        User.countDocuments(filter),
    ]);
    return { customers, pagination: paginationFor(total, page, limit) };
};

const listCustomerOrders = async (customerId, { page = 1, limit = 20 }) => {
    const customer = await User.findOne({ _id: customerId, role: "user" })
        .select(CUSTOMER_FIELDS)
        .lean();
    if (!customer) throw new ApiError(404, "Customer not found.");

    const filter = { user: customerId };
    const [orders, total] = await Promise.all([
        Order.find(filter)
            .select("status createdAt totalAmount paymentMethod paymentStatus items")
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Order.countDocuments(filter),
    ]);
    return { customer, orders: orders.map(orderSummary), pagination: paginationFor(total, page, limit) };
};

export { getAdminDashboard, listAdminCustomers, listCustomerOrders };
