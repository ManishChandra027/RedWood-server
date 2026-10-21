import assert from "node:assert/strict";
import test from "node:test";
import Category from "../src/models/category.model.js";
import Product from "../src/models/product.model.js";
import { uploadOnCloudinary } from "../src/utils/cloudenary.js";
import {
    createAdminCategory,
    deactivateAdminCategory,
    updateAdminCategory,
    updateAdminProduct,
} from "../src/services/adminCatalog.service.js";
import { listCategories, listProducts } from "../src/services/catalog.service.js";
import {
    adminCategoryCreateSchema,
    adminCategoryIdSchema,
    adminProductCreateSchema,
    adminProductListSchema,
    adminProductUpdateSchema,
} from "../src/validations/admin.validation.js";

const restore = (t, model, method, value) => {
    const original = model[method];
    model[method] = value;
    t.after(() => { model[method] = original; });
};

test("admin product validation constrains fields, price/MRP, and pagination", () => {
    const valid = adminProductCreateSchema.validate({
        name: "Field Jacket",
        slug: "field-jacket",
        description: "A durable everyday jacket for all seasons.",
        price: "1299",
        mrp: "1499",
        category: "0123456789abcdef01234567",
        stock: "8",
        isActive: "true",
    });
    assert.equal(valid.error, undefined);
    assert.equal(valid.value.price, 1299);
    assert.equal(valid.value.stock, 8);
    assert.equal(valid.value.isActive, true);

    assert.ok(adminProductCreateSchema.validate({
        name: "Field Jacket",
        slug: "field-jacket",
        description: "A durable everyday jacket for all seasons.",
        price: 1499,
        mrp: 1299,
        category: "0123456789abcdef01234567",
        stock: 8,
    }).error);
    assert.ok(adminProductCreateSchema.validate({
        name: "Field Jacket",
        slug: "field-jacket",
        description: "A durable everyday jacket for all seasons.",
        price: 1299,
        mrp: 1499,
        category: "not-an-id",
        stock: 8,
        unexpected: true,
    }).error);
    assert.ok(adminProductUpdateSchema.validate({ mrp: 500 }).error === undefined);
    assert.ok(adminProductUpdateSchema.validate({ stock: 500 }).error, "stock is reserved for the atomic inventory phase");
    assert.ok(adminProductListSchema.validate({ page: 0 }).error);
    assert.ok(adminProductListSchema.validate({ limit: 51 }).error);
});

test("product image uploads reject unsupported formats before Cloudinary is called", async () => {
    await assert.rejects(
        uploadOnCloudinary("./public/temp/not-present.gif", { mimeType: "image/gif" }),
        (error) => error.statusCode === 400 && /unsupported image format/i.test(error.message),
    );
});

test("admin category validation and identifiers reject malformed values", () => {
    const category = adminCategoryCreateSchema.validate({ name: "Outerwear", slug: "outerwear" });
    assert.equal(category.error, undefined);
    assert.equal(category.value.image, "");
    assert.equal(category.value.isActive, true);
    assert.ok(adminCategoryCreateSchema.validate({ name: "x", slug: "Bad Slug" }).error);
    assert.ok(adminCategoryIdSchema.validate({ categoryId: "bad-id" }).error);
});

test("category deactivation is soft and active storefront category reads exclude it", async (t) => {
    const category = {
        _id: "category-1",
        name: "Outerwear",
        slug: "outerwear",
        isActive: true,
    };
    const historicalProduct = { _id: "product-1", category: category._id, isActive: true };

    restore(t, Category, "findByIdAndUpdate", (id, update) => ({
        lean: async () => {
            if (id !== category._id) return null;
            Object.assign(category, update.$set);
            return { ...category };
        },
    }));
    restore(t, Category, "find", (filter) => ({
        sort: () => ({
            lean: async () => filter.isActive
                ? (category.isActive ? [{ ...category }] : [])
                : [{ ...category }],
        }),
    }));

    const updated = await deactivateAdminCategory(category._id);
    assert.equal(updated.isActive, false);
    assert.equal(historicalProduct.isActive, true, "products are retained when their category is deactivated");
    assert.deepEqual(await listCategories(), []);
});

test("storefront product listing excludes products when their category is inactive", async (t) => {
    let productFilter;
    restore(t, Category, "find", () => ({ distinct: async () => [] }));
    restore(t, Product, "find", (filter) => {
        productFilter = filter;
        return {
            populate: () => ({
                sort: () => ({
                    skip: () => ({
                        limit: () => ({ lean: async () => [] }),
                    }),
                }),
            }),
        };
    });
    restore(t, Product, "countDocuments", async () => 0);

    const result = await listProducts({ page: 1, limit: 12 });
    assert.deepEqual(result.products, []);
    assert.deepEqual(productFilter.category.$in, []);
    assert.equal(productFilter.isActive, true);
});

test("admin category CRUD and product edits preserve images and do not overwrite stock", async (t) => {
    const categoryData = { _id: "category-2", name: "Footwear", slug: "footwear", image: "", isActive: true };
    restore(t, Category, "create", async (data) => ({ toObject: () => ({ _id: categoryData._id, ...data }) }));
    const createdCategory = await createAdminCategory({ name: "Footwear", slug: "footwear" });
    assert.equal(createdCategory.name, "Footwear");

    restore(t, Category, "findByIdAndUpdate", (id, update) => ({
        lean: async () => id === categoryData._id ? { ...categoryData, ...update.$set } : null,
    }));
    const updatedCategory = await updateAdminCategory(categoryData._id, { name: "Shoes" });
    assert.equal(updatedCategory.name, "Shoes");

    const product = {
        _id: "product-2",
        category: "category-2",
        name: "Canvas Shoe",
        description: "A comfortable everyday shoe for all seasons.",
        price: 1000,
        mrp: 1200,
        stock: 9,
        images: [{ url: "https://images.example.test/shoe.png", public_id: "shoe-image" }],
        isActive: true,
        save: async () => {},
    };
    let lookupCount = 0;
    restore(t, Product, "findById", (id) => {
        lookupCount += 1;
        if (lookupCount === 1) return Promise.resolve(product);
        return {
            populate: () => ({
                lean: async () => ({ ...product, category: { _id: categoryData._id, name: "Shoes", isActive: true } }),
            }),
        };
    });

    const editedProduct = await updateAdminProduct({
        productId: product._id,
        data: { name: "Updated Canvas Shoe" },
        files: [],
    });
    assert.equal(editedProduct.name, "Updated Canvas Shoe");
    assert.equal(product.stock, 9);
    assert.equal(product.images[0].public_id, "shoe-image");
});
