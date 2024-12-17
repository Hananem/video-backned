const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');// Adjust the path as needed
const {
    createComment,
    getCommentsByVideo,
    updateCommentOrReply,
    deleteCommentOrReply,
    replyToComment,
    toggleLikeComment,
} = require('../controllers/commentController'); // Adjust the path as needed

// Route to create a comment for a video
router.post('/:videoId', protect, createComment);

// Route to get all comments for a video
router.get('/:videoId', getCommentsByVideo);
// Route to update a comment or reply
router.put('/:commentId', protect, updateCommentOrReply);

// Route to delete a comment or reply
router.delete('/:commentId', protect, deleteCommentOrReply);

// Route to reply to a comment
router.post('/:commentId/reply', protect, replyToComment);

// Route to like/unlike a comment
router.put('/:commentId/like', protect, toggleLikeComment);

module.exports = router;