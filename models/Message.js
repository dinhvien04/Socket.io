const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'emoji'],
        default: 'text'
    },
    room: {
        type: String,
        default: 'general'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema); 