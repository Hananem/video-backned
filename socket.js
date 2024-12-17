const { Server } = require('socket.io');
const User = require('./models/User');
// Assuming your User model is defined here

let io;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: 'http://localhost:3000', // Adjust as needed
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // When a user connects, update their online status
        const userId = socket.handshake.query.userId; // Assuming you send userId as a query parameter when connecting

        if (userId) {
            // Update the user's online status in the database
            updateUserStatus(userId, true);
            // Notify other users that this user is now online
            socket.broadcast.emit('userStatusChange', { userId, isOnline: true });
        }

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            if (userId) {
                // Update the user's online status in the database
                updateUserStatus(userId, false);
                // Notify other users that this user is now offline
                socket.broadcast.emit('userStatusChange', { userId, isOnline: false });
            }
        });

        // Handle sending notifications
        socket.on('sendNotification', (notification) => {
            io.to(notification.recipient).emit('receiveNotification', notification);
        });
    });
};

// Helper function to update user status asynchronously
const updateUserStatus = async (userId, isOnline) => {
    try {
        await User.findByIdAndUpdate(userId, { isOnline });
    } catch (error) {
        console.error(`Error updating user status for ${userId}:`, error);
    }
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket not initialized!');
    }
    return io;
};

module.exports = { initSocket, getIo };