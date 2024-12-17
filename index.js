// Import dependencies
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const videoRoutes = require('./routes/videoRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const commentRoutes = require('./routes/commentRoutes');
const followedRoutes = require('./routes/followedRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const http = require('http');
const { initSocket } = require('./socket'); // Import initSocket

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000; // Default to port 4000 if not specified
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Middleware to parse JSON
app.use(express.json());
app.use(cors());
// Set up routes
app.use('/api/videos', videoRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes); 
app.use('/api/categories', categoryRoutes);
app.use('/api/videos/comments', commentRoutes);
app.use('/api/followed', followedRoutes);
app.use('/api/notifications', notificationRoutes);
// Profile routes
// MongoDB connection (using MongoDB URI from environment variable)
const mongoURI = process.env.MONGO_URI ;// Replace with your database URI

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('Error connecting to MongoDB: ', err));

  // Initialize the socket server
initSocket(server);

// Example route
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
