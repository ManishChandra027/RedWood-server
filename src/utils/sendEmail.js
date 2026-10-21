
import nodemailer from "nodemailer";
import ApiError from "./ApiError.js";
import { logInfo, logServiceError } from "./logger.js";

let transporter;

const getTransporter = () => {
    const requiredEnv = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
    const missing = requiredEnv.filter((key) => !process.env[key]?.trim());
    if (missing.length) {
        throw new ApiError(503, "Email delivery is not configured.");
    }

    const port = Number(process.env.SMTP_PORT);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new ApiError(503, "Email delivery is not configured.");
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const info = await getTransporter().sendMail({
            from: `"RareWolf" <${process.env.SMTP_FROM}>`,
            to,
            subject,
            html,
            text,
        });

        return info;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        // Server-side diagnostics; never log credentials or OTP content.
        logServiceError("smtp.send_failed", error);

        throw new ApiError(
            500,
            "Unable to send email. Please try again later."
        );
    }
};

export const verifyEmailTransport = async () => {
    try {
        await getTransporter().verify();
        logInfo("smtp.verified");
    } catch (error) {
        logServiceError("smtp.verify_failed", error);
        throw error;
    }
};

export default sendEmail;
