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
const userRoutes = require('./routes/user');
const User = require('./models/User');
const Message = require('./models/Message');

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
app.use('/api/users', userRoutes);

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
    socket.on('message:send', async (message) => {
        const msgData = {
            username: socket.username,
            content: message.content || message,
            type: message.type || 'text',
            timestamp: new Date()
        };
        if (message.type === 'file' && message.fileName) {
            msgData.fileName = message.fileName;
        }

        // Lưu vào MongoDB
        try {
            const user = await User.findOne({ username: socket.username });
            if (user) {
                const newMsg = new Message({
                    sender: user._id,
                    content: msgData.content,
                    type: msgData.type,
                    room: message.room || 'general'
                });
                await newMsg.save();
                // Lấy lại tin nhắn đã lưu với đầy đủ thông tin
                const populatedMsg = await Message.findById(newMsg._id).populate('sender', 'username').lean();
                const msgToSend = {
                    _id: populatedMsg._id,
                    username: socket.username,
                    content: populatedMsg.content,
                    type: populatedMsg.type,
                    fileName: populatedMsg.fileName,
                    edited: populatedMsg.edited,
                    timestamp: populatedMsg.createdAt
                };
                socket.emit('message:new', msgToSend);
                socket.broadcast.emit('message:new', msgToSend);
                return;
            }
        } catch (err) {
            console.error('Lỗi khi lưu tin nhắn:', err);
        }
    });

    // Handle message edit
    socket.on('message:edit', async (data) => {
        try {
            const user = await User.findOne({ username: socket.username });
            if (!user) return;

            const message = await Message.findById(data.messageId);
            if (!message || String(message.sender) !== String(user._id)) return;

            message.content = data.newContent;
            message.edited = true;
            message.editedAt = new Date();
            await message.save();

            const updatedMsgData = {
                id: message._id,
                username: socket.username,
                content: message.content,
                type: message.type,
                edited: true,
                editedAt: message.editedAt,
                timestamp: message.createdAt
            };

            // Broadcast edited message to all clients
            io.emit('message:edited', updatedMsgData);
        } catch (err) {
            console.error('Lỗi khi chỉnh sửa tin nhắn:', err);
        }
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