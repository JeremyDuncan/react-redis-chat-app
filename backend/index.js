////// /react-chat-app/backend/index.js

const express = require('express');
const redis = require('redis');
const cors = require('cors');

const app = express();
//app.use(cors({ origin: 'http://localhost:3000' }));
//app.use(cors());

//const corsOptions = {
//    origin: 'https://gingerchat.jeremyd.net',
//    optionsSuccessStatus: 200
//};
const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
};
//
app.use(cors(corsOptions));

app.use(express.json());

const redisClient = redis.createClient({
    url: 'redis://redis:6379' // Use the Docker service name here
});
redisClient.on('error', (err) => console.error('Redis error:', err));

redisClient.connect().catch(console.error);

// Add a new message
app.post('/messages', async (req, res) => {
    const { name, text } = req.body;
    const message = {
        id: Date.now(),
        name,
        text,
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
