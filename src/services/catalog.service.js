import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";

const sortOptions = {
    newest: { createdAt: -1 },
    "price-asc": { price: 1, _id: 1 },
    "price-desc": { price: -1, _id: 1 },
    "rating-desc": { rating: -1, createdAt: -1 },
    "name-asc": { name: 1, _id: 1 },
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toProductResponse = (product) => {
    const category = product.category;
    const firstImage = product.images?.[0];
    const mrp = product.mrp ?? product.price;
    const discount = mrp > product.price
        ? Math.round(((mrp - product.price) / mrp) * 100)
        : 0;

    return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        description: product.description,
        sub: category?.name ?? "",
        price: product.price,
        mrp,
        discount,
        rating: product.rating,
        image: firstImage?.url ?? "",
        images: (product.images ?? []).map(({ url, alt }) => ({ url, alt })),
        category: category
            ? {
                  id: category._id.toString(),
                  name: category.name,
                  slug: category.slug,
                  image: category.image,
              }
            : null,
        stock: product.stock,
        isActive: product.isActive,
    };
};

const listCategories = async () =>
    Category.find({ isActive: true }).sort({ name: 1 }).lean();

const getCategoryBySlug = async (slug) => {
    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
        throw new ApiError(404, "Category not found.");
    }

    return category;
};

const listProducts = async (query) => {
    const {
        search,
        category: categorySlug,
        minPrice,
        maxPrice,
        sort = "newest",
        page = 1,
        limit = 12,
    } = query;
    const activeCategoryIds = await Category.find({ isActive: true }).distinct("_id");
    const filters = {
        isActive: true,
        category: { $in: activeCategoryIds },
    };

    if (categorySlug) {
        const category = await Category.findOne({
            slug: categorySlug,
            isActive: true,
        }).select("_id");
        if (!category) {
            return {
                products: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    pages: 0,
                    hasNextPage: false,
                    hasPreviousPage: page > 1,
                },
            };
        }
        filters.category = category._id;
    }

    if (search) {
        const searchPattern = new RegExp(escapeRegex(search), "i");
        filters.$or = [
            { name: searchPattern },
            { description: searchPattern },
        ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
        filters.price = {};
        if (minPrice !== undefined) filters.price.$gte = minPrice;
        if (maxPrice !== undefined) filters.price.$lte = maxPrice;
    }

    const [products, total] = await Promise.all([
        Product.find(filters)
            .populate("category", "name slug image")
            .sort(sortOptions[sort] || sortOptions.newest)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Product.countDocuments(filters),
    ]);
    const pages = Math.ceil(total / limit);

    return {
        products: products.map(toProductResponse),
        pagination: {
            total,
            page,
            limit,
            pages,
            hasNextPage: page < pages,
            hasPreviousPage: page > 1,
        },
    };
};

const getProductBySlug = async (slug) => {
    const product = await Product.findOne({ slug, isActive: true })
        .populate("category", "name slug image isActive")
        .lean();

    if (!product || !product.category?.isActive) {
        throw new ApiError(404, "Product not found.");
    }

    return toProductResponse(product);
};

export { getCategoryBySlug, getProductBySlug, listCategories, listProducts, toProductResponse };
