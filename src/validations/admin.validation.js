import Joi from "joi";

const objectId = Joi.string().hex().length(24).messages({
    "string.length": "Resource ID must be a valid MongoDB ID.",
});

const slug = Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180);

const productFields = {
    name: Joi.string().trim().min(2).max(160),
    slug,
    description: Joi.string().trim().min(10).max(5000),
    price: Joi.number().min(0),
    mrp: Joi.number().min(0),
    category: objectId,
    stock: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
};

const productPriceRule = (value, helpers) => {
    if (value.mrp !== undefined && value.price !== undefined && value.mrp < value.price) {
        return helpers.error("any.invalid");
    }
    return value;
};

export const adminProductCreateSchema = Joi.object({
    ...productFields,
    name: productFields.name.required(),
    slug: productFields.slug.required(),
    description: productFields.description.required(),
    price: productFields.price.required(),
    mrp: productFields.mrp.required(),
    category: productFields.category.required(),
    stock: productFields.stock.required(),
    isActive: productFields.isActive.default(true),
})
    .unknown(false)
    .custom(productPriceRule)
    .messages({ "any.invalid": "MRP must be greater than or equal to price." });

const productUpdateFields = { ...productFields };
delete productUpdateFields.stock;

export const adminProductUpdateSchema = Joi.object(productUpdateFields)
    .min(1)
    .unknown(false)
    .custom(productPriceRule)
    .messages({ "any.invalid": "MRP must be greater than or equal to price." });

export const adminProductListSchema = Joi.object({
    search: Joi.string().trim().max(100).allow(""),
    category: objectId,
    status: Joi.string().valid("all", "active", "inactive").default("all"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(12),
}).unknown(false);

export const adminCategoryListSchema = Joi.object({
    search: Joi.string().trim().max(100).allow(""),
    status: Joi.string().valid("all", "active", "inactive").default("all"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
}).unknown(false);

export const adminStockAdjustmentSchema = Joi.object({
    adjustment: Joi.number().integer().min(-10000).max(10000).invalid(0).required(),
}).unknown(false);

export const adminLowStockQuerySchema = Joi.object({
    threshold: Joi.number().integer().min(0).max(10000).default(5),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
}).unknown(false);

export const adminOrderListSchema = Joi.object({
    status: Joi.string().valid("all", "placed", "processing", "shipped", "delivered", "cancelled").default("all"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
}).unknown(false);

export const adminOrderStatusSchema = Joi.object({
    status: Joi.string().valid("processing", "shipped", "delivered", "cancelled").required(),
}).unknown(false);

export const adminOrderIdSchema = Joi.object({
    orderId: objectId,
}).unknown(false);

export const adminCustomerListSchema = Joi.object({
    search: Joi.string().trim().max(100).allow(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
}).unknown(false);

export const adminCustomerIdSchema = Joi.object({
    customerId: objectId,
}).unknown(false);

export const adminCustomerOrdersQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
}).unknown(false);


const categoryFields = {
    name: Joi.string().trim().min(2).max(80),
    slug,
    image: Joi.string().uri().allow(""),
    isActive: Joi.boolean(),
};

export const adminCategoryCreateSchema = Joi.object({
    ...categoryFields,
    name: categoryFields.name.required(),
    slug: categoryFields.slug.required(),
    image: categoryFields.image.default(""),
    isActive: categoryFields.isActive.default(true),
}).unknown(false);

export const adminCategoryUpdateSchema = Joi.object(categoryFields)
    .min(1)
    .unknown(false);

export const adminProductIdSchema = Joi.object({
    productId: objectId,
}).unknown(false);

export const adminCategoryIdSchema = Joi.object({
    categoryId: objectId,
}).unknown(false);
