
import nodemailer from "nodemailer";
import ApiError from "./ApiError.js";

const requiredEnv = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing environment variable: ${key}`);
    }
}

const port = Number(process.env.SMTP_PORT);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const info = await transporter.sendMail({
            from: `"JournalPress" <${process.env.SMTP_FROM}>`,
            to,
            subject,
            html,
            text,
        });

        return info;
    } catch (error) {
        // Server-side diagnostics; never log credentials or OTP content.
        console.error("Email sending failed:", {
            code: error.code,
            command: error.command,
            responseCode: error.responseCode,
        });

        throw new ApiError(
            500,
            "Unable to send email. Please try again later."
        );
    }
};

export const verifyEmailTransport = async () => {
    try {
        await transporter.verify();
        console.log("SMTP connection verified.");
    } catch (error) {
        console.error("SMTP connection verification failed:", error.message);
        throw error;
    }
};

export default sendEmail;
