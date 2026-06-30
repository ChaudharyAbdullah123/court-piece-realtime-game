const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ==========================================
// 1. GUEST LOGIN
// ==========================================
router.post('/guest', async (req, res) => {
    try {
        const { username } = req.body;
        const guestName = username || `Guest_${Math.floor(10000 + Math.random() * 90000)}`;

        const user = new User({
            username: guestName,
            isGuest: true
        });

        await user.save();

        const token = jwt.sign({ id: user._id, isGuest: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            username: user.username,
            userId: user._id,
            isGuest: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. FACEBOOK LOGIN
// ==========================================
router.post('/facebook', async (req, res) => {
    try {
        const { accessToken, facebookId, name, friends } = req.body;

        let fbId = facebookId;
        let fbName = name;
        let fbFriends = friends || [];

        // Verify with Facebook Graph API if accessToken is provided and not mock
        if (accessToken && !accessToken.startsWith('mock_')) {
            try {
                const fbUrl = `https://graph.facebook.com/me?fields=id,name,friends&access_token=${accessToken}`;
                const response = await fetch(fbUrl);
                if (!response.ok) {
                    throw new Error('Graph API returned error');
                }
                const data = await response.json();
                fbId = data.id;
                fbName = data.name;
                
                // If they have friends using the app
                if (data.friends && data.friends.data) {
                    fbFriends = data.friends.data.map(friend => friend.id);
                }
            } catch (err) {
                console.error("Facebook token verification failed:", err.message);
                return res.status(401).json({ error: 'Invalid Facebook token' });
            }
        }

        if (!fbId) {
            return res.status(400).json({ error: 'facebookId is required' });
        }

        // Find or create User
        let user = await User.findOne({ facebookId: fbId });
        if (!user) {
            user = new User({
                username: fbName || `FB_Player_${fbId.slice(-4)}`,
                facebookId: fbId,
                isGuest: false,
                friends: fbFriends
            });
        } else {
            // Update fields if changed
            if (fbName) user.username = fbName;
            if (fbFriends.length > 0) user.friends = fbFriends;
        }

        await user.save();

        const token = jwt.sign({ id: user._id, isGuest: false }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            token,
            username: user.username,
            userId: user._id,
            isGuest: false
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. FETCH REGISTERED FACEBOOK FRIENDS
// ==========================================
router.get('/friends', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Retrieve other registered users whose facebookId matches the user's friend list
        const registeredFriends = await User.find({ facebookId: { $in: user.friends } })
            .select('username facebookId stats isGuest');

        res.json({ friends: registeredFriends });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. USER PROFILE
// ==========================================
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            userId: user._id,
            username: user.username,
            isGuest: user.isGuest,
            facebookId: user.facebookId,
            stats: user.stats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
