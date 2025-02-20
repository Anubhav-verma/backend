const express = require("express");
const router = express.Router();
const User = require("../models/user");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

// 📩 Nodemailer Setup (SMTP Config)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Generate OTP (6-Digit)
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 📤 Send OTP for Email Verification
router.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ message: "Email is already verified!" });
        }

        const otp = generateOTP();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

        if (existingUser) {
            existingUser.otp = otp;
            existingUser.otpExpiry = otpExpiry;
            await existingUser.save();
        } else {
            const newUser = new User({ email, otp, otpExpiry, isVerified: false });
            await newUser.save();
        }

        // 📩 Send OTP via Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP for Verification",
            text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
        });

        res.status(200).json({ message: "OTP sent to email" });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ Resend OTP
router.post("/resend-otp", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ message: "User not found!" });

        if (user.isVerified) return res.status(400).json({ message: "User already verified!" });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = Date.now() + 10 * 60 * 1000; // Reset OTP expiry
        await user.save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "New OTP for Verification",
            text: `Your new OTP is ${otp}. It is valid for 10 minutes.`,
        });

        res.status(200).json({ message: "New OTP sent!" });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ Verify OTP
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ message: "User not found!" });

        if (user.isVerified) return res.status(400).json({ message: "User already verified!" });

        if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP!" });

        if (Date.now() > user.otpExpiry) return res.status(400).json({ message: "OTP expired!" });

        // ✅ Mark user as verified
        user.isVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        res.status(200).json({ message: "User verified successfully!" });
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// 📝 Register User (Only after OTP verification)
router.post("/register", async (req, res) => {
    const { email, name, phone, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ message: "User not found!" });

        if (!user.isVerified) return res.status(400).json({ message: "Email not verified. Verify OTP first!" });

        if (user.password) return res.status(400).json({ message: "User already registered!" });

        const hashedPassword = await bcrypt.hash(password, 10);

        user.name = name;
        user.phone = phone;
        user.password = hashedPassword;
        user.role = "Customer";
        await user.save();

        res.status(200).json({ message: "Registration successful!" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// ✅ User Login API (Validate Email & Password)
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ message: "User not found!" });

        if (!user.isVerified) return res.status(400).json({ message: "Email not verified. Please verify first!" });

        // 🔐 Compare Password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: "Invalid password!" });

        res.status(200).json({
            message: "Login successful!",
            user: {
                email: user.email,
                name: user.name,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
module.exports = router;
