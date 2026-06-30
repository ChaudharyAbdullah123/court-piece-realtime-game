const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        if (!MONGO_URI) {
            console.log('⚠️ MONGO_URI is undefined. Running in memory-only mode.');
            return;
        }
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.log("⚠️ Running in memory-only mode (socket gameplay will still work, but session data won't persist).");
    }
};

module.exports = connectDB;
