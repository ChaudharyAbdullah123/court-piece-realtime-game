const mongoose = require('mongoose');

const matchHistorySchema = new mongoose.Schema({
    roomID: { type: String, required: true },
    players: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String, required: true },
        team: { type: String, enum: ['A', 'B'], required: true },
        isBot: { type: Boolean, default: false }
    }],
    scores: {
        A: { type: Number, required: true },
        B: { type: Number, required: true }
    },
    winnerTeam: { type: String, enum: ['A', 'B'], required: true },
    rounds: [{
        roundNumber: { type: Number },
        trump: { type: String },
        trumpSelector: { type: String }, // username
        sar: {
            A: { type: Number },
            B: { type: Number }
        },
        winningTeam: { type: String }
    }],
    isGuestMatch: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('MatchHistory', matchHistorySchema);
