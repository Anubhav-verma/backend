const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/product');
const dotenv = require('dotenv-flow');

dotenv.config(); // Automatically loads the correct .env file based on NODE_ENV

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    console.error("MONGODB_URI is undefined. Check your .env file.");
    process.exit(1);
}

mongoose
    .connect(mongoUri, {
        ssl: true, // Ensure SSL is enabled
        tlsAllowInvalidCertificates: true, // Ignore invalid SSL certs (use only if necessary)
    })
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.error("MongoDB connection error:", err));

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Database'));

// Routes
app.use('/api', productRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
