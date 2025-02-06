const express = require('express');
const multer = require('multer');
const cloudinary = require("cloudinary").v2;
const Product = require('../models/product');
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
const upload = multer({ storage });

// GET all products at /api/products
router.get('/products', async (req, res) => {
    try {
        console.log("Enviroment", process.env);
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST to add a new product with image upload at /api/products/add
router.post('/products/add', upload.single("image"), async (req, res) => {
    try {
        // if (!req.file) {
        //     return res.status(400).json({ message: "No file uploaded" });
        // }
        console.log(req);
        // Upload image to Cloudinary using upload_stream
        cloudinary.uploader.upload_stream({ resource_type: "image" }, async (error, result) => {
            if (error) {
                console.error("Cloudinary upload error:", error);
                return res.status(500).json({ message: "Image upload failed", error });
            }
            console.log(result.secure_url)
            // Create a new product with Cloudinary image URL
            const newProduct = new Product({
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                image: result.secure_url,
            });

            // Save to MongoDB
            await newProduct.save();
            return res.status(201).json({ message: "Product added successfully", product: newProduct });
        }).end(req.file.buffer);
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// DELETE a product at /api/products/:id
router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Extract the public ID from the Cloudinary URL
        const imageUrl = product.image;
        const publicId = imageUrl.split('/').pop().split('.')[0]; // Extract public_id

        // Delete image from Cloudinary
        await cloudinary.uploader.destroy(publicId);

        // Delete the product from MongoDB
        await Product.findByIdAndDelete(req.params.id);

        return res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

module.exports = router;
