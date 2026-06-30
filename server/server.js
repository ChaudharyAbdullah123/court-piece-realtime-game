require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');

// Database
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');

// Socket
const initSocket = require('./socket/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    methods: ["GET","POST"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Start server
const server = http.createServer(app);

// Connect DB
connectDB();

// Initialize Socket.io
initSocket(server);

process.on('uncaughtException', (err) => {
    console.log("UNCAUGHT EXCEPTION");
    console.log(err);
});

process.on('unhandledRejection', (err) => {
    console.log("UNHANDLED REJECTION");
    console.log(err);
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
