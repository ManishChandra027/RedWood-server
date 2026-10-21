import Joi from "joi";

const slug = Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180);

const categoryImportSchema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    slug: slug.required(),
    image: Joi.string().uri().allow("").default(""),
    isActive: Joi.boolean().default(true),
}).unknown(false);

const productImportSchema = Joi.object({
    name: Joi.string().trim().min(2).max(160).required(),
    slug: slug.required(),
    description: Joi.string().trim().min(10).max(5000).required(),
    sub: Joi.string().trim().min(2).max(80).required(),
    price: Joi.number().min(0).required(),
    mrp: Joi.number().min(0).required(),
    discount: Joi.number().integer().min(0).max(100),
    rating: Joi.number().min(0).max(5).required(),
    image: Joi.string().uri().required(),
    stock: Joi.number().integer().min(0).required(),
    isActive: Joi.boolean().default(true),
})
    .unknown(false)
    .custom((product, helpers) => {
        if (product.mrp < product.price) {
            return helpers.error("any.invalid");
        }
        return product;
    })
    .messages({ "any.invalid": "Product MRP must not be below its price." });

export const catalogImportSchema = Joi.object({
    categories: Joi.array().items(categoryImportSchema).min(1).required(),
    products: Joi.array().items(productImportSchema).min(1).required(),
})
    .unknown(false)
    .custom((catalog, helpers) => {
        const categoryNames = new Set(
            catalog.categories.map((category) => category.name.toLowerCase())
        );
        const categorySlugs = new Set(catalog.categories.map((category) => category.slug));
        const productSlugs = new Set();

        for (const category of catalog.categories) {
            if (categoryNames.size !== catalog.categories.length || categorySlugs.size !== catalog.categories.length) {
                return helpers.error("any.invalid", { reason: "Duplicate category name or slug." });
            }
        }

        for (const product of catalog.products) {
            if (!categoryNames.has(product.sub.toLowerCase())) {
                return helpers.error("any.invalid", { reason: `Unknown category: ${product.sub}.` });
            }
            if (productSlugs.has(product.slug)) {
                return helpers.error("any.invalid", { reason: `Duplicate product slug: ${product.slug}.` });
            }
            productSlugs.add(product.slug);
        }

        return catalog;
    })
    .messages({ "any.invalid": "Invalid catalogue JSON: {{#reason}}" });

export const productListQuerySchema = Joi.object({
    search: Joi.string().trim().max(100).allow(""),
    category: slug,
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    sort: Joi.string()
        .valid("newest", "price-asc", "price-desc", "rating-desc", "name-asc")
        .default("newest"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(12),
})
    .unknown(false)
    .custom((query, helpers) => {
        if (
            query.minPrice !== undefined &&
            query.maxPrice !== undefined &&
            query.minPrice > query.maxPrice
        ) {
            return helpers.error("any.invalid");
        }
        return query;
    })
    .messages({
        "any.invalid": "minPrice cannot be greater than maxPrice.",
        "object.unknown": "Unknown query parameter is not allowed.",
    });

export const addCartItemSchema = Joi.object({
    productId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            "string.length": "productId must be a valid product ID.",
        }),
    quantity: Joi.number().integer().min(1).max(99).default(1),
})
    .unknown(false)
    .messages({
        "object.unknown": "Unknown field is not allowed.",
    });

export const cartItemParamsSchema = Joi.object({
    productId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({ "string.length": "productId must be a valid product ID." }),
}).unknown(false);

export const updateCartItemSchema = Joi.object({
    quantity: Joi.number().integer().min(1).max(99).required(),
}).unknown(false);
