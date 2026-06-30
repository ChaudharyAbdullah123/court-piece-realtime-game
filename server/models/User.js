const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String }, // Optional since guest/FB login do not use traditional password
    facebookId: { type: String, unique: true, sparse: true },
    isGuest: { type: Boolean, default: false },
    friends: [{ type: String }], // Array of facebookIds of their friends playing this game
    stats: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        gamesLost: { type: Number, default: 0 },
        courtsWon: { type: Number, default: 0 }, // 13-trick win rounds
        courtsLost: { type: Number, default: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
