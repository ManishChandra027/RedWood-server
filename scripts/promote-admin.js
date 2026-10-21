import "dotenv/config";
import mongoose from "mongoose";
import connectDb from "../src/db/index.js";
import User from "../src/models/user.model.js";

const email = process.argv[2]?.trim().toLowerCase();
const confirmation = process.argv[3];

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Usage: npm run promote:admin -- <verified-account-email> --confirm");
    process.exitCode = 1;
} else if (confirmation !== "--confirm") {
    console.error("Role changes require the explicit --confirm flag.");
    console.error("Usage: npm run promote:admin -- <verified-account-email> --confirm");
    process.exitCode = 1;
} else {
    try {
        await connectDb();
        const user = await User.findOne({ email }).select("email role isVerified");
        if (!user) throw new Error("No account exists for that email address.");
        if (!user.isVerified) throw new Error("The account must verify its email before promotion.");
        if (user.role !== "user" && user.role !== "admin") throw new Error("This account cannot be promoted by this command.");
        if (user.role !== "admin") {
            user.role = "admin";
            await user.save();
        }
        console.log(`Admin access is enabled for ${user.email}.`);
    } catch (error) {
        console.error(`Admin promotion failed: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}