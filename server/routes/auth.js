const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { verifyFirebaseToken } = require('../utils/firebaseAdmin');

const router  = express.Router();

// ============================================================
// HELPER: generate JWT
// ============================================================
function signToken(user, isGuest = false) {
    return jwt.sign(
        { 
            id: user._id, 
            isGuest, 
            username: user.username, 
            photoURL: user.photoURL || '' 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// ============================================================
// 1. GUEST LOGIN (no DB record — token only)
// ============================================================
router.post('/guest', async (req, res) => {
    try {
        const { username } = req.body;
        const guestName = username?.trim() || `Guest_${Math.floor(10000 + Math.random() * 90000)}`;

        // Lightweight guest token — no DB write to avoid index conflicts
        const guestPayload = { id: `guest_${Date.now()}`, isGuest: true, username: guestName };
        const token = jwt.sign(guestPayload, process.env.JWT_SECRET, { expiresIn: '4h' });

        res.status(200).json({ token, username: guestName, userId: guestPayload.id, isGuest: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 2. FIREBASE FACEBOOK LOGIN (Real OAuth)
// ============================================================
router.post('/firebase-facebook', async (req, res) => {
    try {
        const { idToken, uid, displayName, photoURL } = req.body;

        if (!idToken || !uid)
            return res.status(400).json({ error: 'idToken and uid are required' });

        // Verify the Firebase ID token via REST API
        let firebaseUser;
        try {
            firebaseUser = await verifyFirebaseToken(idToken);
        } catch (err) {
            return res.status(401).json({ error: err.message });
        }

        const verifiedUid = firebaseUser.localId;
        const name        = firebaseUser.displayName || displayName || `Player_${verifiedUid.slice(-4)}`;
        const photo       = firebaseUser.photoUrl    || photoURL    || '';

        // Find or create the user by Firebase UID
        let user = await User.findOne({ firebaseUid: verifiedUid });

        if (!user) {
            user = new User({
                username:    name,
                firebaseUid: verifiedUid,
                photoURL:    photo,
                isGuest:     false,
                friends:     []
            });
        } else {
            user.username = name;
            user.photoURL = photo;
        }

        // Auto-friend all other Facebook-authenticated users in the app
        const otherFbUsers = await User.find({
            firebaseUid: { $exists: true, $ne: verifiedUid }
        }).select('firebaseUid friends');

        const otherUids = otherFbUsers.map(u => u.firebaseUid);
        user.friends = Array.from(new Set([...(user.friends || []), ...otherUids]));
        await user.save();

        // Mutually add current user to others' friends lists
        await Promise.all(otherFbUsers.map(async (other) => {
            if (!other.friends.includes(verifiedUid)) {
                other.friends.push(verifiedUid);
                await other.save();
            }
        }));

        res.json({
            token:    signToken(user, false),
            username: user.username,
            userId:   user._id,
            photoURL: user.photoURL,
            isGuest:  false
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 3. GET FRIENDS (registered Facebook users in the app)
// ============================================================
router.get('/friends', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user    = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const friends = await User.find({
            firebaseUid: { $in: user.friends || [] }
        }).select('username firebaseUid photoURL stats');

        const onlineTracker = require('../utils/onlineTracker');
        const friendsWithStatus = friends.map(f => ({
            _id:         f._id,
            username:    f.username,
            firebaseUid: f.firebaseUid,
            photoURL:    f.photoURL,
            stats:       f.stats,
            online:      onlineTracker.has(f._id)
        }));

        res.json({ friends: friendsWithStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 4. PROFILE
// ============================================================
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.isGuest) {
            return res.json({ username: decoded.username, isGuest: true, stats: {} });
        }

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            userId:   user._id,
            username: user.username,
            isGuest:  user.isGuest,
            photoURL: user.photoURL,
            stats:    user.stats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 5. MATCH HISTORY
// ============================================================
router.get('/history', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.isGuest) return res.json({ matches: [] });

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const MatchHistory = require('../models/MatchHistory');
        const matches = await MatchHistory.find({ 'players.username': user.username })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ matches });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
