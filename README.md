# Real-time Chat Application

A real-time chat application built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- Real-time messaging using Socket.IO
- User authentication
- Message history storage
- Online user tracking
- Typing indicators
- Support for text, emoji, and images
- Dark mode support

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
├── routes/          # API routes
├── middleware/      # Custom middleware
└── public/         # Static files
```

## API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/messages` - Get message history
- `POST /api/messages` - Send a new message

## Socket.IO Events

- `user:join` - User joins the chat
- `message:send` - Send a new message
- `user:typing` - User typing status
- `user:left` - User leaves the chat

## Contributing

Feel free to submit issues and enhancement requests. 