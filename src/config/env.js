const requiredVariables = [
    "MONGO_URL",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRES_IN",
    "REFRESH_TOKEN_EXPIRES_IN",
    "CORS_ORIGIN",
    "CLIENT_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];

const parseOrigins = (value) =>
    value.split(",").map((origin) => origin.trim()).filter(Boolean);

const validateEnvironment = (env = process.env) => {
    const missing = requiredVariables.filter((name) => !env[name]?.trim());
    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if (env.NODE_ENV && !["development", "test", "production"].includes(env.NODE_ENV)) {
        throw new Error("NODE_ENV must be development, test, or production.");
    }
    if (env.NODE_ENV === "production") {
        if (env.ACCESS_TOKEN_SECRET === env.REFRESH_TOKEN_SECRET) {
            throw new Error("Production access and refresh token secrets must be different.");
        }
        if (env.ACCESS_TOKEN_SECRET.length < 32 || env.REFRESH_TOKEN_SECRET.length < 32) {
            throw new Error("Production access and refresh token secrets must each be at least 32 characters.");
        }
    }

    try {
        const mongoUrl = new URL(env.MONGO_URL);
        if (!["mongodb:", "mongodb+srv:"].includes(mongoUrl.protocol)) throw new Error();
    } catch {
        throw new Error("MONGO_URL must be a valid MongoDB connection URL.");
    }

    const origins = parseOrigins(env.CORS_ORIGIN);
    if (origins.length === 0 || origins.some((origin) => {
        try {
            const parsed = new URL(origin);
            return !["http:", "https:"].includes(parsed.protocol) ||
                parsed.pathname !== "/" || Boolean(parsed.search || parsed.hash || parsed.username || parsed.password);
        } catch {
            return true;
        }
    })) {
        throw new Error("CORS_ORIGIN must contain one or more comma-separated HTTP(S) origins.");
    }

    try {
        const clientUrl = new URL(env.CLIENT_URL);
        if (!["http:", "https:"].includes(clientUrl.protocol)) throw new Error();
    } catch {
        throw new Error("CLIENT_URL must be a valid HTTP(S) URL.");
    }

    const port = Number(env.PORT || 8000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535.");
    }
    const smtpPort = Number(env.SMTP_PORT);
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
        throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
    }
    if (env.SMTP_SECURE && !["true", "false"].includes(env.SMTP_SECURE.toLowerCase())) {
        throw new Error("SMTP_SECURE must be true or false.");
    }

    if (env.TRUST_PROXY_HOPS && (!/^\d+$/.test(env.TRUST_PROXY_HOPS) || Number(env.TRUST_PROXY_HOPS) < 1)) {
        throw new Error("TRUST_PROXY_HOPS must be a positive integer when configured.");
    }

    return { port, origins };
};

export { parseOrigins, requiredVariables, validateEnvironment };
