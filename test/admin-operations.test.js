import assert from "node:assert/strict";
import test from "node:test";
import Order from "../src/models/order.model.js";
import Product from "../src/models/product.model.js";
import {
    adjustProductStock,
    updateAdminOrderStatus,
} from "../src/services/adminOperations.service.js";
import {
    adminLowStockQuerySchema,
    adminOrderStatusSchema,
    adminStockAdjustmentSchema,
} from "../src/validations/admin.validation.js";

const restore = (t, model, method, value) => {
    const original = model[method];
    model[method] = value;
    t.after(() => { model[method] = original; });
};

test("inventory and order inputs reject unsafe values and default low-stock threshold to five", () => {
    assert.equal(adminStockAdjustmentSchema.validate({ adjustment: 1 }).error, undefined);
    for (const adjustment of [0, 1.5, 10001, -10001]) {
        assert.ok(adminStockAdjustmentSchema.validate({ adjustment }).error);
    }
    assert.equal(adminLowStockQuerySchema.validate({}).value.threshold, 5);
    assert.ok(adminOrderStatusSchema.validate({ status: "paid" }).error);
    assert.ok(adminOrderStatusSchema.validate({ status: "shipped", paymentStatus: "paid" }).error);
});

test("concurrent checkout reservation and admin adjustment use conditional increments and never go negative", async (t) => {
    const product = { _id: "product-a", stock: 5 };
    restore(t, Product, "findOneAndUpdate", async (filter, update) => {
        if (filter.stock?.$gte !== undefined && product.stock < filter.stock.$gte) return null;
        product.stock += update.$inc.stock;
        return { ...product };
    });
    restore(t, Product, "exists", async () => true);

    const checkoutReservation = async () => {
        const reserved = await Product.findOneAndUpdate(
            { _id: product._id, isActive: true, price: 100, stock: { $gte: 4 } },
            { $inc: { stock: -4 } },
            { new: true },
        );
        if (!reserved) throw Object.assign(new Error("Insufficient stock"), { statusCode: 409 });
        return reserved;
    };
    const results = await Promise.allSettled([
        adjustProductStock(product._id, -4),
        checkoutReservation(),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected" && result.reason.statusCode === 409).length, 1);
    assert.equal(product.stock, 1);
});

test("admin order transitions reject repeated updates and cancellation restores stock once", async (t) => {
    const order = {
        _id: "order-a",
        status: "placed",
        items: [{ product: "product-a", quantity: 3 }],
    };
    let stock = 2;
    restore(t, Order, "findOneAndUpdate", async (filter, update) => {
        if (order._id !== filter._id || order.status !== filter.status) return null;
        Object.assign(order, update.$set);
        return { ...order, items: order.items };
    });
    restore(t, Order, "exists", async () => true);
    restore(t, Order, "updateOne", async () => ({ matchedCount: 1 }));
    restore(t, Product, "updateOne", async (_filter, update) => {
        stock += update.$inc.stock;
        return { matchedCount: 1 };
    });

    const cancellations = await Promise.allSettled([
        updateAdminOrderStatus(order._id, "cancelled"),
        updateAdminOrderStatus(order._id, "cancelled"),
    ]);
    assert.equal(cancellations.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(cancellations.filter((result) => result.status === "rejected" && result.reason.statusCode === 409).length, 1);
    assert.equal(stock, 5, "only the winning cancellation returns its reserved units");

    order.status = "processing";
    await assert.rejects(updateAdminOrderStatus(order._id, "delivered"), (error) => error.statusCode === 409);
});
