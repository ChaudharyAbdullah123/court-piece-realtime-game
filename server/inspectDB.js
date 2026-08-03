const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI || 'mongodb://localhost:27017/court-piece-db');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/court-piece-db');
        console.log('Connected to MongoDB.');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const usersColl = mongoose.connection.db.collection('users');
        
        // Find users
        const users = await usersColl.find({}).toArray();
        console.log(`Found ${users.length} total users:`);
        users.forEach(u => {
            console.log(`- ID: ${u._id}, Username: ${u.username}, Email: ${u.email}, FacebookId: ${u.facebookId}, isGuest: ${u.isGuest}`);
        });

        // Clean up users that have null/empty email or facebookId that could clash
        console.log('Cleaning up users with null/undefined/empty email to avoid duplicate key errors...');
        
        // Let's drop indexes first to let us rebuild them cleanly
        try {
            console.log('Dropping email_1 and facebookId_1 indexes if they exist...');
            await usersColl.dropIndex('email_1');
            console.log('Dropped email_1 index.');
        } catch (e) {
            console.log('Could not drop email_1 (might not exist):', e.message);
        }

        try {
            await usersColl.dropIndex('facebookId_1');
            console.log('Dropped facebookId_1 index.');
        } catch (e) {
            console.log('Could not drop facebookId_1 (might not exist):', e.message);
        }

        // Delete guest users so we start fresh
        const deleteGuestsResult = await usersColl.deleteMany({ isGuest: true });
        console.log(`Deleted ${deleteGuestsResult.deletedCount} guest users.`);

        // For other users, if email is null or undefined, unset it
        const unsetEmailsResult = await usersColl.updateMany(
            { email: { $in: [null, ''] } },
            { $unset: { email: '' } }
        );
        console.log(`Unset email field on ${unsetEmailsResult.modifiedCount} users.`);

        const unsetFbResult = await usersColl.updateMany(
            { facebookId: { $in: [null, ''] } },
            { $unset: { facebookId: '' } }
        );
        console.log(`Unset facebookId field on ${unsetFbResult.modifiedCount} users.`);

        console.log('Database clean completed successfully!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
