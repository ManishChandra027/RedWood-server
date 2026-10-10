import mongoose, { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            select: false,
        },

        avatar: {
            url: {
                type: String,
                default:
                    "https://i.pinimg.com/236x/5a/bd/98/5abd985735a8fd4adcb0e795de6a1005.jpg?nii=t",
            },
            public_id: {
                type: String,
                default: "",
            },
        },

        phone: {
            type: String,
            trim: true,
            default: "",
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },

        isVerified: {
            type: Boolean,
            default: false, // Email verification status
        },

        isPhoneVerified: {
            type: Boolean,
            default: false, // Phone verification status
        },

        refreshToken: {
            type: String,
            select: false,
        },

        passwordResetOtp: {
            type: String,
            select: false,
        },
        passwordResetOtpExpires: {
            type: Date,
            select: false,
        },
        passwordResetToken: {
            type: String,
            select: false,
        },

        passwordResetTokenExpires: {
            type: Date,
            select: false,
        },

        emailVerificationOtp: {
            type: String,
            select: false,
        },

        emailVerificationExpires: {
            type: Date,
            select: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordValid = async function (password) {
    return await bcrypt.compare(password, this.password); //return true/false
};

userSchema.methods.generateAccessToken = function () {
    const payload = {
        _id: this._id,
        role: this.role,
    };

    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    });
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    });
};

const User = model("User", userSchema);
export default User;
