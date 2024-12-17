const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    videoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Video', // Reference to the Video model
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Reference to the User model
    },
    text: { 
        type: String, 
        required: true 
    },
    likes: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' // Array of User IDs who liked the comment
    }],
    replies: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment' // Reference to the Comment model for nested replies
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;