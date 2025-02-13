const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    images: { type: [String], required: true }, // Change to array for multiple images
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discountedPrice: { type: Number, default: null }
});

module.exports = mongoose.model('Product', productSchema, 'Products');
