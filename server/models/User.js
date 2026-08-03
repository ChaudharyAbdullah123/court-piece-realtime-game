const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:    { type: String, required: true },
    email:       { type: String, unique: true, sparse: true },
    password:    { type: String },                          // email/password login
    facebookId:  { type: String, unique: true, sparse: true }, // legacy field
    firebaseUid: { type: String, unique: true, sparse: true }, // Firebase UID (FB / Google OAuth)
    photoURL:    { type: String, default: '' },             // profile picture from Facebook
    isGuest:     { type: Boolean, default: false },
    friends:     [{ type: String }],                        // array of firebaseUids of friends in this app
    stats: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon:    { type: Number, default: 0 },
        gamesLost:   { type: Number, default: 0 },
        courtsWon:   { type: Number, default: 0 },
        courtsLost:  { type: Number, default: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
