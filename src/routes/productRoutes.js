const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Product = require("../models/product"); // Product model
const router = express.Router();
require("dotenv").config();

// 🔹 Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// 🔹 Multer for File Upload (stores file in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔹 API to Upload Image & Save Product in MongoDB
router.post("/products/add", upload.single("image"), async (req, res) => {
    try {
        // Upload image to Cloudinary
        const result = await cloudinary.uploader.upload_stream({ resource_type: "image" }, async (error, result) => {
            if (error) return res.status(500).json({ message: "Image upload failed", error });
            console.log(result.secure_url)
            // Create new product with Cloudinary image URL
            const newProduct = new Product({
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                imageUrl: result.secure_url, // Cloudinary Image URL
            });

            // Save to MongoDB
            await newProduct.save();
            res.status(201).json({ message: "Product added successfully", product: newProduct });
        });

        // Pipe image buffer into Cloudinary
        result.end(req.file.buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error });
    }
});

module.exports = router;
