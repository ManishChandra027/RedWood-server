import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import addressRoutes from "./routes/address.route.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import { categoryRouter, productRouter } from "./routes/catalog.routes.js";
import errorHandler from "./middleware/error.middleware.js";
import { requestLogger } from "./utils/logger.js";
import { parseOrigins } from "./config/env.js";

const app = express();

const trustedProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS, 10);
if (Number.isInteger(trustedProxyHops) && trustedProxyHops > 0) {
    app.set("trust proxy", trustedProxyHops);
}

const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN || "");

app.use(requestLogger);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
    },
    credentials: true,
}));

app.use(express.json({ limit: "16kb" })); //to conver json to js object in body
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/api/v1/health", (req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;
    return res.status(databaseReady ? 200 : 503).json({
        success: databaseReady,
        message: databaseReady ? "RareWolf API is ready." : "RareWolf API is not ready.",
    });
});

// http://localhost:8000/api/v1/auth/
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);

app.use(errorHandler);

export default app;
