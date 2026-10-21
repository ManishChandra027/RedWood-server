import "dotenv/config";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import Category from "../src/models/category.model.js";
import Product from "../src/models/product.model.js";
import connectDb from "../src/db/index.js";
import { catalogImportSchema } from "../src/validations/catalog.validation.js";

const catalogPath = new URL("../src/data/catalog.json", import.meta.url);

const importCatalog = async () => {
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

    const { error, value } = catalogImportSchema.validate(catalog, {
        abortEarly: false,
        convert: true,
    });
    if (error) {
        throw new Error(error.details.map((detail) => detail.message).join(" "));
    }

    const validatedCatalog = value;

    await connectDb();

    const categoryByName = new Map();
    for (const categoryData of validatedCatalog.categories) {
        const category = await Category.findOneAndUpdate(
            { slug: categoryData.slug },
            {
                $set: {
                    name: categoryData.name,
                    slug: categoryData.slug,
                    image: categoryData.image,
                    isActive: categoryData.isActive,
                },
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        categoryByName.set(category.name.trim().toLowerCase(), category);
    }

    let importedProducts = 0;
    for (const productData of validatedCatalog.products) {
        const category = categoryByName.get(productData.sub.trim().toLowerCase());
        if (!category) {
            throw new Error(
                `Product "${productData.name}" references unknown category "${productData.sub}".`
            );
        }

        const product = new Product({
            name: productData.name,
            slug: productData.slug,
            description: productData.description,
            price: productData.price,
            mrp: productData.mrp,
            rating: productData.rating,
            images: [
                {
                    url: productData.image,
                    alt: productData.name,
                },
            ],
            category: category._id,
            stock: productData.stock,
            isActive: productData.isActive,
        });
        await product.validate();
        const productDataToSave = product.toObject();
        delete productDataToSave._id;
        delete productDataToSave.__v;
        delete productDataToSave.createdAt;
        delete productDataToSave.updatedAt;
        await Product.updateOne(
            { slug: product.slug },
            { $set: productDataToSave },
            { upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        importedProducts += 1;
    }

    console.log(
        `Catalogue imported: ${catalog.categories.length} categories, ${importedProducts} products.`
    );
};

try {
    await importCatalog();
} catch (error) {
    console.error("Catalogue import failed:", error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
