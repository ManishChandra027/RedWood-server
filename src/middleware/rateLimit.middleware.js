import { createHash } from "node:crypto";
import mongoose from "mongoose";

const createMemoryStore = (now) => {
    const requestsByKey = new Map();

    return {
        async increment(key, currentTime, windowMs) {
            let record = requestsByKey.get(key);
            if (!record || record.resetAt <= currentTime) {
                record = { count: 0, resetAt: currentTime + windowMs };
                requestsByKey.set(key, record);
            }
            record.count += 1;

            if (requestsByKey.size > 10_000) {
                for (const [storedKey, storedRecord] of requestsByKey) {
                    if (storedRecord.resetAt <= currentTime) requestsByKey.delete(storedKey);
                    if (requestsByKey.size <= 8_000) break;
                }
            }

            return record;
        },
    };
};

let mongoIndexesPromise;
const mongoStore = {
    async increment(bucketKey, currentTime, windowMs) {
        const collection = mongoose.connection.collection("authRateLimitBuckets");
        mongoIndexesPromise ??= Promise.all([
            collection.createIndex({ bucketKey: 1 }, { unique: true }),
            collection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }),
        ]).catch((error) => {
            mongoIndexesPromise = null;
            throw error;
        });
        await mongoIndexesPromise;

        const nowDate = new Date(currentTime);
        const resetAt = new Date(currentTime + windowMs);
        const active = await collection.updateOne(
            { bucketKey, resetAt: { $gt: nowDate } },
            { $inc: { count: 1 } },
        );
        if (active.matchedCount) return collection.findOne({ bucketKey });

        const expired = await collection.updateOne(
            { bucketKey, resetAt: { $lte: nowDate } },
            { $set: { count: 1, resetAt } },
        );
        if (expired.matchedCount) return collection.findOne({ bucketKey });

        try {
            await collection.insertOne({ bucketKey, count: 1, resetAt });
            return { count: 1, resetAt };
        } catch (error) {
            if (error?.code !== 11000) throw error;
            await collection.updateOne(
                { bucketKey, resetAt: { $gt: nowDate } },
                { $inc: { count: 1 } },
            );
            return collection.findOne({ bucketKey });
        }
    },
};

const createRateLimiter = ({
    limit = 10,
    windowMs = 15 * 60 * 1000,
    keyGenerator = (req) => req.ip || req.socket?.remoteAddress || "unknown",
    now = Date.now,
    store = createMemoryStore(now),
    name = "rate-limit",
} = {}) => {
    if (!Number.isInteger(limit) || limit < 1) {
        throw new TypeError("Rate limit must be a positive integer.");
    }
    if (!Number.isFinite(windowMs) || windowMs < 1) {
        throw new TypeError("Rate-limit window must be a positive number of milliseconds.");
    }

    return async (req, res, next) => {
        const currentTime = now();
        const identities = keyGenerator(req);
        const keys = (Array.isArray(identities) ? identities : [identities])
            .map((identity) => String(identity || "unknown"))
            .map((identity) => createHash("sha256")
                .update(`${name}:${identity}`)
                .digest("hex"));
        let records;
        try {
            records = await Promise.all(
                keys.map((key) => store.increment(key, currentTime, windowMs)),
            );
        } catch (error) {
            return next(error);
        }
        const record = records.reduce((highest, current) =>
            current.count > highest.count ? current : highest,
        );
        const remaining = Math.max(0, limit - record.count);
        const resetMilliseconds = record.resetAt instanceof Date
            ? record.resetAt.getTime()
            : record.resetAt;
        const resetSeconds = Math.max(1, Math.ceil((resetMilliseconds - currentTime) / 1000));

        res.set("RateLimit-Limit", String(limit));
        res.set("RateLimit-Remaining", String(remaining));
        res.set("RateLimit-Reset", String(resetSeconds));

        if (record.count > limit) {
            res.set("Retry-After", String(resetSeconds));
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
            });
        }

        return next();
    };
};

const rateLimit = (name, limit = 10, time = 15, options = {}) =>
    createRateLimiter({
        name,
        limit,
        windowMs: time * 60 * 1000,
        store: mongoStore,
        ...options,
    });

export { createMemoryStore, createRateLimiter };
export default rateLimit;
