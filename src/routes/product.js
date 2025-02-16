const express = require('express');
const multer = require('multer');
const cloudinary = require("cloudinary").v2;
const Product = require('../models/product');
const mongoose = require("mongoose");
const router = express.Router();
const dotenv = require("dotenv-flow");
dotenv.config();

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET all products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ **Updated: Handle multiple image uploads & discounted price**
router.post('/products/add', upload.array("images", 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        let imageUrls = [];

        // Upload multiple images to Cloudinary
        for (const file of req.files) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }).end(file.buffer);
            });

            imageUrls.push(result.secure_url);
        }

        // ✅ Parse lotInfo safely (expecting JSON format)
        let lotInfo = [];
        try {
            lotInfo = JSON.parse(req.body.lotInfo);
            if (!Array.isArray(lotInfo)) throw new Error();
        } catch (error) {
            return res.status(400).json({ message: "Invalid lotInfo format" });
        }

        // Create and save new product
        const newProduct = new Product({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            discountedPrice: req.body.discountedPrice || null, // ✅ Added discountedPrice field
            images: imageUrls,
            lotInfo
        });

        await newProduct.save();
        return res.status(201).json({ message: "Product added successfully", product: newProduct });

    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// ✅ **Restored: Delete Product (Supports Multiple Images)**
router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Extract public IDs from all image URLs
        const publicIds = product.images.map((imageUrl) => {
            const parts = imageUrl.split('/');
            return parts[parts.length - 1].split('.')[0]; // Extract public_id
        });

        // Delete all images from Cloudinary
        for (const publicId of publicIds) {
            await cloudinary.uploader.destroy(publicId);
        }

        // Delete product from MongoDB
        await Product.findByIdAndDelete(req.params.id);

        return res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// ✅ **Updated: Edit product with discountedPrice**
router.put('/products/:id', upload.array("images", 5), async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ Validate if id is a proper ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        let updatedImageUrls = JSON.parse(req.body.existingImages || "[]");

        if (req.files && req.files.length > 0) {
            // Delete existing images from Cloudinary
            const publicIds = product.images.map((imageUrl) => {
                const parts = imageUrl.split('/');
                return parts[parts.length - 1].split('.')[0];
            });

            for (const publicId of publicIds) {
                await cloudinary.uploader.destroy(publicId);
            }

            // Upload new images
            for (const file of req.files) {
                const result = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }).end(file.buffer);
                });

                updatedImageUrls.push(result.secure_url);
            }
        }

        let updatedLotInfo = [];
        try {
            updatedLotInfo = JSON.parse(req.body.lotInfo);
            if (!Array.isArray(updatedLotInfo)) throw new Error();
        } catch (error) {
            return res.status(400).json({ message: "Invalid lotInfo format" });
        }

        // ✅ Update product details including discountedPrice
        product.name = req.body.name || product.name;
        product.description = req.body.description || product.description;
        product.price = req.body.price || product.price;
        product.discountedPrice = req.body.discountedPrice || product.discountedPrice; // ✅ Added field
        product.images = updatedImageUrls;
        product.lotInfo = updatedLotInfo;

        await product.save();
        return res.status(200).json({ message: "Product updated successfully", product });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

module.exports = router;
