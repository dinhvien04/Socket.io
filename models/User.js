const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
    fullName: {
        type: String,
        trim: true
    },
    bio: {
        type: String,
        trim: true
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    emailVerificationToken: String,
    isEmailVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Method to get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.resetPasswordToken;
    delete userObject.resetPasswordExpires;
    delete userObject.emailVerificationToken;
    return userObject;
};

module.exports = mongoose.model('User', userSchema); 