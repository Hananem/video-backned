const express = require('express');
const router = express.Router();
const {
    createNotification,
    getNotificationsForUser,
    markNotificationAsRead,
    deleteNotification,
} = require('../controllers/notificationController');

// Middleware to authenticate and attach user info (if required)
const protect= require('../middleware/authMiddleware');

// Create a new notification
router.post('/', protect, createNotification);

// Get all notifications for a specific user
router.get('/', protect, getNotificationsForUser);

// Mark a notification as read
router.patch('/:notificationId/read', protect, markNotificationAsRead);

// Delete a notification
router.delete('/:notificationId', protect, deleteNotification);

module.exports = router;
