const User = require('../models/User');
const Video = require('../models/Video');
const mongoose = require('mongoose');

const getFollowedUsersVideos = async (req, res) => {
    try {
      const currentUserId = req.user.id;
  
      // Ensure the user ID is valid
      if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      // Get the list of followed users
      const currentUser = await User.findById(currentUserId).select("following");
  
      if (!currentUser) {
        return res.status(404).json({ message: "User not found." });
      }
  
      if (currentUser.following.length === 0) {
        return res.status(200).json({ message: "No followed users", videos: [] });
      }
  
      // Get videos from followed users based on privacy settings
      const videos = await Video.find({
        user: { $in: currentUser.following },
        $or: [
          { privacyStatus: "public" },
          { privacyStatus: "followers" },
          { user: currentUserId } // Allow private videos of the current user
        ]
      })
        .populate('user', 'username profilePic') // Populate video creator details
        .sort({ createdAt: -1 });
  
      res.status(200).json({ message: "Videos from followed users fetched successfully.", videos });
    } catch (error) {
      console.error("Error fetching followed users' videos:", error);
      res.status(500).json({ message: "Error fetching followed users' videos", error: error.message });
    }
  };

  module.exports = { 

    getFollowedUsersVideos
   };
  