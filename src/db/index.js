import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { logInfo, logServiceError } from "../utils/logger.js";

const connectDb = async () => {
    try {
        const connectionString = new URL(process.env.MONGO_URL);

        connectionString.searchParams.set("retryWrites", "false");

        console.log("MongoDB options:", {
            host: connectionString.host,
            database: connectionString.pathname,
            retryWrites: connectionString.searchParams.get("retryWrites"),
        });

        const connectionInstance = await mongoose.connect(
            connectionString.toString()
        );

        logInfo("database.connected", {
            databaseHost: connectionInstance.connection.host,
        });

        return connectionInstance;
    } catch (error) {
        logServiceError("database.connection_failed", error);
        throw error;
    }
};

export default connectDb;
