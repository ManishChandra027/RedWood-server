import assert from "node:assert/strict";
import test from "node:test";
import Order from "../src/models/order.model.js";
import Product from "../src/models/product.model.js";
import User from "../src/models/user.model.js";
import {
    getAdminDashboard,
    listAdminCustomers,
    listCustomerOrders,
} from "../src/services/adminOverview.service.js";
import {
    adminCustomerIdSchema,
    adminCustomerListSchema,
    adminCustomerOrdersQuerySchema,
} from "../src/validations/admin.validation.js";

const restore = (t, model, method, value) => {
    const original = model[method];
    model[method] = value;
    t.after(() => { model[method] = original; });
};

test("customer list and order query validation set pagination bounds", () => {
    assert.deepEqual(adminCustomerListSchema.validate({}).value, { page: 1, limit: 20 });
    assert.equal(adminCustomerListSchema.validate({ search: "  ", page: 2 }).value.search, "");
    assert.ok(adminCustomerListSchema.validate({ limit: 51 }).error);
    assert.ok(adminCustomerOrdersQuerySchema.validate({ page: 0 }).error);
    assert.ok(adminCustomerIdSchema.validate({ customerId: "not-an-id" }).error);
});

test("customer list selects safe profile fields and never returns admins", async (t) => {
    let queryFilter;
    let projection;
    const safeCustomer = { _id: "customer-a", fullName: "Asha Rao", email: "asha@example.test", phone: "9876543210", isVerified: true, isPhoneVerified: false, createdAt: new Date() };
    restore(t, User, "find", (filter) => {
        queryFilter = filter;
        return {
            select: (fields) => { projection = fields; return {
                sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [safeCustomer] }) }) }),
            }; },
        };
    });
    restore(t, User, "countDocuments", async () => 1);

    const result = await listAdminCustomers({ search: "asha+test", page: 1, limit: 10 });
    assert.equal(queryFilter.role, "user");
    assert.match(queryFilter.$or[1].email.source, /asha\\\+test/i);
    assert.equal(projection, "fullName email phone isVerified isPhoneVerified createdAt");
    assert.deepEqual(result.customers, [safeCustomer]);
    for (const privateField of ["password", "refreshToken", "passwordResetOtp", "emailVerificationOtp"]) {
        assert.ok(!projection.split(" ").includes(privateField));
    }
});

test("customer order history is owner-scoped and returns only summary fields", async (t) => {
    let selectedCustomerFields;
    let orderFilter;
    let orderFields;
    const customer = { _id: "customer-b", fullName: "Dev Shah", email: "dev@example.test", isVerified: true };
    restore(t, User, "findOne", (filter) => ({
        select: (fields) => { assert.deepEqual(filter, { _id: "customer-b", role: "user" }); selectedCustomerFields = fields; return { lean: async () => customer }; },
    }));
    restore(t, Order, "find", (filter) => {
        orderFilter = filter;
        return { select: (fields) => { orderFields = fields; return {
            sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [{ _id: "order-a", status: "placed", createdAt: new Date(), totalAmount: 500, items: [{ quantity: 2 }] }] }) }) }),
        }; } };
    });
    restore(t, Order, "countDocuments", async () => 1);

    const result = await listCustomerOrders("customer-b", { page: 1, limit: 20 });
    assert.deepEqual(orderFilter, { user: "customer-b" });
    assert.equal(orderFields, "status createdAt totalAmount paymentMethod paymentStatus items");
    assert.equal(selectedCustomerFields, "fullName email phone isVerified isPhoneVerified createdAt");
    assert.equal(result.orders[0].itemCount, 2);
    assert.equal(result.orders[0].deliveryAddress, undefined);
    assert.equal(result.pagination.total, 1);
});

test("dashboard counts and summary lists stay bounded, with no revenue aggregate", async (t) => {
    const countFilters = [];
    const query = (rows) => ({
        select: () => query(rows),
        populate: () => query(rows),
        sort: () => query(rows),
        limit: (limit) => { assert.equal(limit, 5); return query(rows); },
        lean: async () => rows,
    });
    restore(t, Product, "countDocuments", async (filter) => { countFilters.push(["products", filter]); return 4; });
    restore(t, Product, "find", () => query([{ _id: "product-a", name: "Boot", slug: "boot", stock: 3 }]));
    restore(t, User, "countDocuments", async (filter) => { countFilters.push(["users", filter]); return 7; });
    restore(t, Order, "countDocuments", async (filter) => { countFilters.push(["orders", filter]); return filter.status ? 2 : 9; });
    restore(t, Order, "find", (filter) => query(filter.status ? [{ _id: "order-open", user: { fullName: "Asha" }, status: "placed", totalAmount: 300, items: [{ quantity: 1 }] }] : []));

    const dashboard = await getAdminDashboard();
    assert.deepEqual(dashboard.counts, { activeProducts: 4, customers: 7, orders: 9, outstandingOrders: 2 });
    assert.equal(dashboard.lowStockThreshold, 5);
    assert.equal(dashboard.lowStockProducts.length, 1);
    assert.equal(dashboard.outstandingOrders[0].itemCount, 1);
    assert.deepEqual(countFilters, [
        ["products", { isActive: true }],
        ["users", { role: "user" }],
        ["orders", {}],
        ["orders", { status: { $in: ["placed", "processing"] } }],
    ]);
});
