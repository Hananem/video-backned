const Notification = require('../models/Notification');
const User = require('../models/User');

// Create a new notification
const createNotification = async (req, res) => {
    try {
        const { recipient, sender, type, video, comment, message } = req.body;

        const notification = new Notification({
            recipient,
            sender,
            type,
            video,
            comment,
            message,
        });

        const savedNotification = await notification.save();

        // Emit notification to the recipient if online
        const io = require('../socket').getIo();
        io.to(recipient.toString()).emit('receiveNotification', savedNotification);

        res.status(201).json(savedNotification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Error creating notification' });
    }
};

// Get notifications for a specific user
const getNotificationsForUser = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user ID is available via middleware

        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .populate('sender', 'username')
            .populate('video', 'title')
            .populate('comment', 'content');

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Error fetching notifications' });
    }
};

// Mark a notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const updatedNotification = await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );

        if (!updatedNotification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.status(200).json(updatedNotification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Error marking notification as read' });
    }
};

// Delete a notification
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const deletedNotification = await Notification.findByIdAndDelete(notificationId);

        if (!deletedNotification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Error deleting notification' });
    }
};

module.exports = {
    createNotification,
    getNotificationsForUser,
    markNotificationAsRead,
    deleteNotification,
};
