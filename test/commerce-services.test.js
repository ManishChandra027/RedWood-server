import assert from "node:assert/strict";
import test from "node:test";

import { Address } from "../src/models/address.model.js";
import Cart from "../src/models/cart.model.js";
import Category from "../src/models/category.model.js";
import Order from "../src/models/order.model.js";
import Product from "../src/models/product.model.js";
import {
  createAddress,
  deleteAddress,
  updateAddress,
} from "../src/services/address.service.js";
import { addCartItem } from "../src/services/cart.service.js";
import { createOrderFromCart } from "../src/services/order.service.js";
import { getProductBySlug, listProducts } from "../src/services/catalog.service.js";
import { getUserOrders } from "../src/services/order.service.js";

const restoreMethods = (t, model, overrides) => {
  const originals = Object.fromEntries(
    Object.keys(overrides).map((key) => [key, model[key]]),
  );
  Object.assign(model, overrides);
  t.after(() => Object.assign(model, originals));
};

const matches = (document, filter) =>
  Object.entries(filter).every(([key, expected]) => {
    if (key === "_id" && expected?.$ne) return document._id !== expected.$ne;
    return document[key]?.toString() === expected?.toString();
  });

test("address rules keep a default, enforce ownership, and protect the default from deletion", async (t) => {
  const rows = [];
  let nextId = 1;
  const findOne = async (filter) => rows.find((row) => matches(row, filter)) || null;
  restoreMethods(t, Address, {
    find: (filter) => ({
      sort: async () => rows.filter((row) => matches(row, filter)),
    }),
    findOne,
    create: async (data) => {
      const row = { ...data, _id: `address-${nextId++}` };
      rows.push(row);
      return row;
    },
    updateMany: async (filter, update) => {
      rows.filter((row) => matches(row, filter)).forEach((row) => Object.assign(row, update.$set));
    },
    updateOne: async (filter, update) => {
      const row = await findOne(filter);
      if (row) Object.assign(row, update.$set);
    },
    findOneAndUpdate: async (filter, update) => {
      const row = await findOne(filter);
      if (row) Object.assign(row, update.$set);
      return row;
    },
    findOneAndDelete: async (filter) => {
      const row = await findOne(filter);
      if (!row) return null;
      rows.splice(rows.indexOf(row), 1);
      return row;
    },
  });

  const addressInput = (fullName) => ({
    fullName,
    phone: "9876543210",
    addressLine1: "12 Example Road",
    city: "New Delhi",
    state: "Delhi",
    pinCode: "110001",
    country: "India",
  });

  const first = await createAddress("user-a", addressInput("First"));
  const second = await createAddress("user-a", addressInput("Second"));
  assert.equal(first.isDefault, true, "the first saved address becomes default");
  assert.equal(second.isDefault, false, "a later address does not replace the default implicitly");

  await assert.rejects(
    deleteAddress("user-a", first._id),
    (error) => error.statusCode === 409,
  );
  await assert.rejects(
    updateAddress("user-b", second._id, { fullName: "Changed" }),
    (error) => error.statusCode === 404,
  );

  await updateAddress("user-a", second._id, { isDefault: true });
  assert.equal(first.isDefault, false);
  assert.equal(second.isDefault, true);
  await deleteAddress("user-a", first._id);
  assert.equal(rows.length, 1);
  await assert.rejects(
    deleteAddress("user-a", second._id),
    (error) => error.statusCode === 409,
    "the only remaining default address cannot be deleted",
  );
});

test("cart add rejects a quantity that would exceed current stock", async (t) => {
  const productId = "product-1";
  const currentCart = {
    items: [{ product: { equals: (id) => id === productId }, quantity: 2 }],
    save: async () => assert.fail("cart must not save after a stock conflict"),
    populate: async () => currentCart,
  };
  restoreMethods(t, Product, {
    findOne: () => ({ select: async () => ({ _id: productId, stock: 3, category: "category-1" }) }),
  });
  restoreMethods(t, Category, {
    findOne: () => ({ select: async () => ({ _id: "category-1" }) }),
  });
  restoreMethods(t, Cart, { findOne: async () => currentCart });

  await assert.rejects(
    addCartItem("user-a", productId, 2),
    (error) => error.statusCode === 409 && /stock/i.test(error.message),
  );
});

test("checkout writes immutable product, price, and delivery-address snapshots", async (t) => {
  const product = {
    _id: "product-1",
    name: "Sample jacket",
    slug: "sample-jacket",
    price: 1999.5,
    images: [{ url: "https://example.test/jacket.png" }],
    isActive: true,
    category: "category-1",
  };
  const cart = {
    _id: "cart-1",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    items: [{ product, quantity: 2 }],
  };
  const address = {
    fullName: "Buyer Name",
    phone: "9876543210",
    addressLine1: "Old Address 1",
    city: "New Delhi",
    state: "Delhi",
    pinCode: "110001",
    country: "India",
  };
  let createdOrder;
  restoreMethods(t, Cart, {
    findOne: () => ({ populate: async () => cart }),
    findOneAndDelete: async () => cart,
  });
  restoreMethods(t, Address, { findOne: async () => address });
  restoreMethods(t, Category, { exists: async () => true });
  restoreMethods(t, Product, {
    findOneAndUpdate: async () => ({ ...product, stock: 8 }),
    updateOne: async () => ({}),
  });
  restoreMethods(t, Order, {
    create: async (data) => {
      createdOrder = { _id: "order-1", ...data };
      return createdOrder;
    },
    deleteOne: async () => ({}),
  });

  const order = await createOrderFromCart("user-a", "address-1");
  assert.equal(order, createdOrder);
  assert.deepEqual(order.items[0], {
    product: "product-1",
    name: "Sample jacket",
    slug: "sample-jacket",
    image: "https://example.test/jacket.png",
    quantity: 2,
    unitPrice: 1999.5,
    lineTotal: 3999,
  });
  assert.deepEqual(order.deliveryAddress, address);
  assert.equal(order.subtotal, 3999);
  assert.equal(order.totalAmount, 3999);
  assert.equal(order.status, "placed");
  assert.equal(order.paymentStatus, "pending");

  product.name = "Renamed jacket";
  address.addressLine1 = "Changed Address 2";
  assert.equal(order.items[0].name, "Sample jacket");
  assert.equal(order.deliveryAddress.addressLine1, "Old Address 1");
});

test("customer purchase journey browses a product, adds to cart, checks out, and lists the order", async (t) => {
  const category = {
    _id: "category-1",
    name: "Fashion",
    slug: "fashion",
    image: "https://example.test/fashion.png",
    isActive: true,
  };
  const product = {
    _id: "product-flow-1",
    name: "Canvas jacket",
    slug: "canvas-jacket",
    description: "A durable everyday canvas jacket for cool weather.",
    price: 1200,
    mrp: 1500,
    rating: 4.5,
    images: [{ url: "https://example.test/canvas-jacket.png" }],
    stock: 5,
    isActive: true,
    category,
  };
  const address = {
    fullName: "Test Buyer",
    phone: "9876543210",
    addressLine1: "18 Market Road",
    city: "New Delhi",
    state: "Delhi",
    pinCode: "110001",
    country: "India",
  };
  const cart = { _id: "cart-flow-1", updatedAt: new Date(), items: [] };
  const orders = [];

  restoreMethods(t, Category, {
    find: () => ({ distinct: async () => [category._id] }),
    findOne: () => ({ select: async () => ({ _id: category._id }) }),
    exists: async () => true,
  });
  const productListQuery = {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    lean: async () => [product],
  };
  const productDetailQuery = {
    populate() { return this; },
    lean: async () => product,
    select: async () => product,
  };
  restoreMethods(t, Product, {
    find: () => productListQuery,
    countDocuments: async () => 1,
    findOne: () => productDetailQuery,
    findOneAndUpdate: async (_filter, update) => {
      product.stock += update.$inc.stock;
      return product;
    },
  });
  restoreMethods(t, Cart, {
    findOne: () => cart.items.length
      ? { populate: async () => cart }
      : Promise.resolve(null),
    create: async (data) => {
      cart.items = data.items.map((item) => ({
        ...item,
        product: { _id: product._id, equals: (id) => id === product._id },
      }));
      return cart;
    },
    findOneAndDelete: async () => cart,
  });
  cart.populate = async () => {
    cart.items = cart.items.map((item) => ({ ...item, product }));
    return cart;
  };
  restoreMethods(t, Address, { findOne: async () => address });
  restoreMethods(t, Order, {
    create: async (data) => {
      const order = { _id: `order-flow-${orders.length + 1}`, ...data };
      orders.unshift(order);
      return order;
    },
    find: () => ({
      sort() { return this; },
      limit() { return this; },
      lean: async () => orders,
    }),
    deleteOne: async () => ({}),
  });

  const catalogue = await listProducts({ page: 1, limit: 12 });
  assert.equal(catalogue.products[0].slug, "canvas-jacket");
  assert.equal(catalogue.pagination.total, 1);
  const detail = await getProductBySlug("canvas-jacket");
  assert.equal(detail.price, 1200);

  const cartAfterAdd = await addCartItem("user-flow-1", product._id, 2);
  assert.equal(cartAfterAdd.items[0].quantity, 2);
  const order = await createOrderFromCart("user-flow-1", "address-flow-1");
  assert.equal(order.totalAmount, 2400);
  assert.equal(product.stock, 3, "checkout reserves inventory");
  const orderHistory = await getUserOrders("user-flow-1");
  assert.equal(orderHistory[0]._id, order._id);
  assert.equal(orderHistory[0].items[0].quantity, 2);
});
