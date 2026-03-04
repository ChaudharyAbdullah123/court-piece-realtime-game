require('dotenv').config();
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
    origin: "http://localhost:3000",
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

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
