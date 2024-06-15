const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

// Create messages table if not exists
pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        readAt DATETIME
    );
`).catch(err => console.log(err));

// Get all messages
app.get('/messages', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query("SELECT * FROM messages ORDER BY timestamp");
        conn.release();
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

// Add a new message
app.post('/messages', async (req, res) => {
    const { name, text } = req.body;
    try {
        const conn = await pool.getConnection();
        await conn.query("INSERT INTO messages (name, text) VALUES (?, ?)", [name, text]);
        conn.release();
        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

// Update read status
app.put('/messages/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        const conn = await pool.getConnection();
        await conn.query("UPDATE messages SET readAt = NOW() WHERE id = ?", [id]);
        conn.release();
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
