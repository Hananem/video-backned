const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Reference to the User model for the recipient of the notification
        required: true 
    },
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Reference to the User model for the user who triggered the notification
        required: true 
    },
    type: { 
        type: String, // Type of notification: 'like', 'reply', etc.
        enum: ['like', 'reply', 'comment', 'reaction', 'follow'], // Expanded list of notification types
        required: true 
    },
    video: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Video', // Optional reference to the Video model if applicable
    },
    comment: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment', // Reference to the Comment model if applicable
    },
    isRead: { 
        type: Boolean, 
        default: false // Indicates whether the notification has been read
    },
    message: { type: String },
    createdAt: { 
        type: Date, 
        default: Date.now // Timestamp for when the notification was created
    },
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;