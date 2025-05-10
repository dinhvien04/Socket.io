const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload');
const User = require('./models/User');

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
app.use('/api/upload', uploadRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Quản lý user online duy nhất
const onlineUsers = new Set();
const userSockets = {};

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle user joining
    socket.on('user:join', (username) => {
        socket.username = username;
        // Quản lý socket theo user
        if (!userSockets[username]) userSockets[username] = new Set();
        userSockets[username].add(socket.id);
        onlineUsers.add(username);
        // Emit danh sách user online duy nhất
        io.emit('user:online-list', Array.from(onlineUsers));
        io.emit('user:joined', {
            username: username,
            id: socket.id,
            timestamp: new Date()
        });
    });

    // Handle new messages
    socket.on('message:send', (message) => {
        const msgData = {
            username: socket.username,
            content: message.content || message,
            type: message.type || 'text',
            timestamp: new Date()
        };
        if (message.type === 'file' && message.fileName) {
            msgData.fileName = message.fileName;
        }
        // Gửi về cho chính socket gửi và các socket khác
        socket.emit('message:new', msgData);
        socket.broadcast.emit('message:new', msgData);
    });

    // Handle typing status
    socket.on('user:typing', (isTyping) => {
        socket.broadcast.emit('user:typing', {
            username: socket.username,
            isTyping: isTyping
        });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        if (socket.username) {
            // Xóa socket khỏi userSockets
            if (userSockets[socket.username]) {
                userSockets[socket.username].delete(socket.id);
                if (userSockets[socket.username].size === 0) {
                    // Không còn socket nào của user này, xóa khỏi online
                    onlineUsers.delete(socket.username);
                    delete userSockets[socket.username];
                    // Set isOnline=false trong DB
                    try {
                        await User.findOneAndUpdate({ username: socket.username }, { isOnline: false });
                    } catch (e) { }
                }
            }
            io.emit('user:online-list', Array.from(onlineUsers));
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