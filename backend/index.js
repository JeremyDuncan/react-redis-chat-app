const express = require('express');
const redis = require('redis');
const cors = require('cors');
const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});
redisClient.on('error', (err) => console.error('Redis error:', err));

redisClient.connect().catch(console.error);

const storage = multer.memoryStorage(); // Store files in memory temporarily
const upload = multer({ storage: storage });

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.MINIO_ENDPOINT,
    s3ForcePathStyle: true, // needed with MinIO
    signatureVersion: 'v4',
    sslEnabled: process.env.MINIO_USE_SSL === 'true'
});

// Add a new message
app.post('/messages', upload.single('image'), async (req, res) => {
    const { name, text } = req.body;
    let imageUrl = null;

    if (req.file) {
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${Date.now()}_${req.file.originalname}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: 'public-read'
        };

        try {
            const data = await s3.upload(params).promise();
            imageUrl = data.Location;
        } catch (err) {
            console.error('Error uploading image to S3:', err);
            return res.status(500).send(err.toString());
        }
    }

    const message = {
        id: Date.now(),
        name,
        text,
        imageUrl,
        timestamp: new Date(),
        readAt: null
    };
    try {
        await redisClient.lPush('messages', JSON.stringify(message)); // Push message to list
        
        // Increment unread count for the other user
        const otherUser = name === 'Jeremy' ? 'Kasey' : 'Jeremy';
        await redisClient.hIncrBy('unread_counts', otherUser, 1);

        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

// Get all messages
app.get('/messages', async (req, res) => {
    try {
        const messages = await redisClient.lRange('messages', 0, -1); // Get all messages
        const parsedMessages = messages.map(msg => JSON.parse(msg));

        // Sort messages by timestamp
        const sortedMessages = parsedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json(sortedMessages);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

// Get unread counts
app.get('/unread-counts', async (req, res) => {
    try {
        const unreadCounts = await redisClient.hGetAll('unread_counts');
        res.json(unreadCounts);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

// Update read status
app.put('/messages/:id/read', async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;
    try {
        const messages = await redisClient.lRange('messages', 0, -1);
        const parsedMessages = messages.map(msg => JSON.parse(msg));

        for (let i = 0; i < parsedMessages.length; i++) {
            if (parsedMessages[i].id === parseInt(id)) {
                parsedMessages[i].readAt = new Date();
                await redisClient.lSet('messages', i, JSON.stringify(parsedMessages[i]));
                break;
            }
        }

        await redisClient.hSet('user_status', user, JSON.stringify({ lastReadMessageId: id }));

        // Reset unread count for the user
        await redisClient.hSet('unread_counts', user, 0);

        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

// Set typing status
app.post('/typing', async (req, res) => {
    const { user, isTyping } = req.body;
    try {
        await redisClient.hSet('typing_status', user, isTyping.toString());
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

// Get typing status and last read message
app.get('/status/:user', async (req, res) => {
    const { user } = req.params;
    try {
        const isTyping = await redisClient.hGet('typing_status', user);
        const userStatus = await redisClient.hGet('user_status', user);
        res.json({ isTyping: isTyping === 'true', lastReadMessageId: userStatus ? JSON.parse(userStatus).lastReadMessageId : null });
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
