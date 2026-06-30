require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Database
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');

// Socket
const initSocket = require('./socket/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting for auth routes (100 requests per 15 minutes)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false
});

// Middlewares
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
    methods: ['GET','POST']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to auth routes
app.use('/api/auth', authLimiter);
app.use('/api/auth', authRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', uptime: process.uptime() });
});

// Start server
const server = http.createServer(app);

// Connect DB
connectDB();

// Initialize Socket.io
initSocket(server);

// Graceful Shutdown
function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
        console.log('🚪 HTTP server closed.');
        
        const mongoose = require('mongoose');
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            mongoose.connection.close().then(() => {
                console.log('🔌 MongoDB connection closed.');
                process.exit(0);
            }).catch(err => {
                console.error('❌ Error closing MongoDB connection:', err);
                process.exit(1);
            });
        } else {
            process.exit(0);
        }
    });

    // Force close after 10s
    setTimeout(() => {
        console.error('⚠️ Graceful shutdown timed out. Force quitting...');
        process.exit(1);
    }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION');
    console.log(err);
});

process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION');
    console.log(err);
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
