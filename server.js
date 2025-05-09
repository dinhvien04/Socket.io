const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle user joining
    socket.on('user:join', (username) => {
        socket.username = username;
        io.emit('user:joined', {
            username: username,
            id: socket.id,
            timestamp: new Date()
        });
    });

    // Handle new messages
    socket.on('message:send', (message) => {
        io.emit('message:new', {
            username: socket.username,
            content: message.content || message,
            type: message.type || 'text',
            timestamp: new Date()
        });
    });

    // Handle typing status
    socket.on('user:typing', (isTyping) => {
        socket.broadcast.emit('user:typing', {
            username: socket.username,
            isTyping: isTyping
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('user:left', {
                username: socket.username,
                timestamp: new Date()
            });
        }
        console.log('Client disconnected');
    });
});

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 