# Real-time Chat Application

A modern real-time chat application built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- **Real-time messaging** using Socket.IO
- **User authentication** (register, login, JWT-based)
- **Message history** (stored in MongoDB)
- **Online user tracking**
- **Typing indicators**
- **Support for text, emoji, images, and file attachments**
- **Send and preview images/files** in chat
- **Image preview before sending** (see a thumbnail before uploading)
- **Automatic image resize & compression** before upload (save bandwidth)
- **Send files with original name (including Vietnamese characters)**
- **Download files with correct original name**
- **Modern file/image upload menu** (choose image or file, beautiful UI)
- **Beautiful file message UI** (icon, file name, download button)
- **Dark mode** (toggle theme)
- **Emoji picker**
- **Notification sounds** for new messages
- **Toast notifications** for system events
- **Responsive design** (mobile & desktop)
- **View account info** (click avatar to see username/email)
- **Logout** from account
- **.gitignore** to keep uploads, node_modules, .env out of git
- **Delete (hide) your own messages**: You can delete (hide) any message you sent, and it will disappear from your chat view but remain visible to others.
- **Voice message (Record and send voice messages):** Record directly in the browser, send the recording file to the server, everyone can listen to the voice message even when reloading the page or logging in from another device.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chat-app
   JWT_SECRET=your_jwt_secret_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── server.js          # Main server file
├── models/           # MongoDB models
│   ├── User.js      # User model
│   └── Message.js   # Message model
├── routes/          # API routes (auth, messages, upload)
├── middleware/      # Custom middleware
├── public/          # Static files (frontend, uploads)
│   ├── css/
│   ├── js/
│   └── uploads/     # Uploaded files/images (gitignored)
└── .gitignore       # Ignore uploads, node_modules, .env
```

## API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/messages` - Get message history
- `POST /api/messages` - Send a new message
- `POST /api/upload` - Upload image/file (authenticated)

## Socket.IO Events

- `user:join` - User joins the chat
- `message:send` - Send a new message (text, emoji, image, file)
- `message:new` - Receive a new message
- `user:typing` - User typing status
- `user:left` - User leaves the chat

## Contributing

Feel free to submit issues and enhancement requests. 