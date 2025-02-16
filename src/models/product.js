const mongoose = require('mongoose');

const lotInfoSchema = new mongoose.Schema({
    size: {
        type: String,
        enum: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"], // ✅ Allowed Sizes
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0  // ✅ Ensures quantity is non-negative
    }
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    images: { type: [String], required: true }, // Change to array for multiple images
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discountedPrice: { type: Number, default: null },
    lotInfo: [lotInfoSchema]  // ✅ Array of size-quantity objects
});

module.exports = mongoose.model('Product', productSchema, 'Products');
