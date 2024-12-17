const User = require('../models/User');
const Video = require('../models/Video');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');
const Notification = require('../models/Notification');
const { getIo } = require('../socket');
const mongoose = require('mongoose');

const updateProfile = async (req, res) => {
  try {
    // Find user by their ID
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, email, bio, password } = req.body;

    // Update username, email, and bio if provided
    if (username) user.username = username;
    if (email) user.email = email;
    if (bio) user.bio = bio;

    // If a password is provided, hash and update it
    if (password) {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Save the updated user data
    const updatedUser = await user.save();

    // Return the updated user data (without sending the password)
    const { password: _, ...userWithoutPassword } = updatedUser.toObject();

    res.json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Function to upload a profile photo
const uploadProfilePhoto = async (req, res) => {
  console.log(req.user);
  try {
    const user = await User.findById(req.user._id);  // Assuming you are using JWT auth to get the user ID from the request
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if file exists in the request
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload the new image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'profile_photos',  // Specify folder on Cloudinary
    });

    // Update the profilePhoto field with the new URL and public_id
    user.profilePhoto = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    await user.save();  // Save the updated user data

    res.status(200).json({
      message: 'Profile photo updated successfully',
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Import User model

const uploadBackgroundImage = async (req, res) => {
  console.log(req.user);  // Log user information (from JWT or session)
  try {
    const user = await User.findById(req.user._id);  // Fetch user from DB using ID from JWT
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the file exists in the request
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload the new image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'background_images',  // Specify folder in Cloudinary
    });

    // Update the backgroundImage field with the new URL and public_id
    user.backgroundImage = {
      url: result.secure_url,  // Store Cloudinary URL
      publicId: result.public_id,  // Store public ID for future deletion
    };

    await user.save();  // Save the updated user data

    res.status(200).json({
      message: 'Background image updated successfully',
      backgroundImage: user.backgroundImage,  // Send back the updated background image
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Controller to get profile details by user ID
const getProfileById = async (req, res) => {
  try {
    const userId = req.params.id || req.query.id; // Get the user ID from params or query

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId)
      .populate('videos', 'title description thumbnailUrl createdAt')
      .populate('followers', 'username profilePhoto')
      .populate('following', 'username profilePhoto')
      .populate('savedVideos', 'title thumbnailUrl duration views description')
      .populate({
        path: 'watchedVideos.video',
        select: 'title thumbnailUrl duration views description ',
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      message: 'Profile fetched successfully', 
      profile: {
         id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePhoto: user.profilePhoto,
        backgroundImage: user.backgroundImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        followers: user.followers,
        following: user.following,
        videos: user.videos,
        savedVideos: user.savedVideos,
        watchedVideos: user.watchedVideos,
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};



const deleteProfile = async (req, res) => {
  try {
    // Find user by their ID (assumes req.user._id is set by authentication middleware)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove profile photo from Cloudinary if it exists
    if (user.profilePhoto && user.profilePhoto.publicId) {
      await cloudinary.uploader.destroy(user.profilePhoto.publicId);
    }

    // Remove background image from Cloudinary if it exists
    if (user.backgroundImage && user.backgroundImage.publicId) {
      await cloudinary.uploader.destroy(user.backgroundImage.publicId);
    }

    // Delete the user from the database using findByIdAndDelete
    await User.findByIdAndDelete(req.user._id);

    // Respond with a success message and the user ID
    res.status(200).json({ message: 'User profile deleted successfully', userId: req.user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};


const removeBio = async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // Assuming req.user._id is set by authentication middleware
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clear the bio field
    user.bio = '';

    // Save the updated user document
    await user.save();

    res.status(200).json({
      message: 'Bio removed successfully',
      user: {
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePhoto: user.profilePhoto,
        backgroundImage: user.backgroundImage,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Follow a user
const followUser = async (req, res) => {
  try {
    const userIdToFollow = req.params.userId;
    const currentUserId = req.user.id;

    if (currentUserId === userIdToFollow) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    const userToFollow = await User.findById(userIdToFollow);
    if (!userToFollow) {
      return res.status(404).json({ message: "User not found." });
    }

    const currentUser = await User.findById(currentUserId);

    // Toggle follow/unfollow logic
    const isFollowing = userToFollow.followers.includes(currentUserId);

    if (isFollowing) {
      // Unfollow the user
      userToFollow.followers = userToFollow.followers.filter(
        (followerId) => followerId.toString() !== currentUserId
      );
      currentUser.following = currentUser.following.filter(
        (followingId) => followingId.toString() !== userIdToFollow
      );

      await Promise.all([userToFollow.save(), currentUser.save()]);

      return res.status(200).json({
        message: "Successfully unfollowed the user.",
        following: currentUser.following, // Updated following array
      });
    } else {
      // Follow the user
      userToFollow.followers.push(currentUserId);
      currentUser.following.push(userIdToFollow);

      await Promise.all([userToFollow.save(), currentUser.save()]);

      const notification = new Notification({
        recipient: userIdToFollow,
        sender: currentUserId,
        type: "follow",
        isRead: false,
        message: `${currentUser.username} has followed you.`,
      });

      await notification.save();

      const io = getIo();
      if (io) io.to(userIdToFollow.toString()).emit("receiveNotification", notification);

      return res.status(200).json({
        message: "Successfully followed the user.",
        following: currentUser.following, // Updated following array
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Error toggling follow status", error: error.message });
  }
};

const fetchFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID and populate the followers field
    const user = await User.findById(userId).populate('followers', 'username profilePhoto');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Return the followers with basic details
    return res.status(200).json({
      followers: user.followers.map(follower => ({
        id: follower._id,
        username: follower.username,
        profilePhoto: follower.profilePhoto,
      })),
    });
  } catch (error) {
    console.error('Error fetching followers:', error.message);
    return res.status(500).json({ message: 'Error fetching followers.', error: error.message });
  }
};


// Remove a follower
const removeFollower = async (req, res) => {
  try {
    const userId = req.user._id; // The logged-in user (assuming req.user is set by middleware)
    const { followerId } = req.params; // The ID of the follower to be removed

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the follower exists in the followers list
    const isFollower = user.followers.includes(followerId);
    if (!isFollower) {
      return res.status(400).json({ message: 'The user is not your follower' });
    }

    // Remove the follower from the followers list
    user.followers.pull(followerId);
    await user.save();

    res.status(200).json({
      message: 'Follower removed successfully',
      followers: user.followers, // Updated followers list
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
      const userIdToUnfollow = req.params.userId; // ID of the user to unfollow
      const currentUserId = req.user.id; // ID of the currently authenticated user

      // Find the user to unfollow
      const userToUnfollow = await User.findById(userIdToUnfollow);
      if (!userToUnfollow) {
          return res.status(404).json({ message: "User not found." });
      }

      // Check if currently following
      const currentUser = await User.findById(currentUserId);
      if (!currentUser.following.includes(userIdToUnfollow)) {
          return res.status(400).json({ message: "You are not following this user." });
      }

      // Remove from followers and following arrays
      userToUnfollow.followers.pull(currentUserId);
      await userToUnfollow.save();

      currentUser.following.pull(userIdToUnfollow);
      await currentUser.save();

      res.status(200).json({ message: "Successfully unfollowed the user." });
  } catch (error) {
      res.status(500).json({ message: "Error unfollowing user", error: error.message });
  }
};


const watchVideo = async (req, res) => {
  try {
      const { videoId } = req.params;
      const userId = req.user.id;

      // Validate videoId to ensure it's a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(videoId)) {
          return res.status(400).json({ message: 'Invalid video ID' });
      }

      // Fetch user and video documents
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      const video = await Video.findById(videoId);
      if (!video) {
          return res.status(404).json({ message: 'Video not found' });
      }

      // Check if the user has watched the video in the last 5 minutes
      const watchedEntry = user.watchedVideos.find((entry) =>
          entry.video.equals(video._id)
      );

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (!watchedEntry || watchedEntry.lastWatchedAt < fiveMinutesAgo) {
          // Increment the view count
          video.views += 1;
          await video.save();

          // Update or add to the user's watchedVideos array
          if (watchedEntry) {
              watchedEntry.lastWatchedAt = new Date();
          } else {
              user.watchedVideos.push({
                  video: video._id,
                  lastWatchedAt: new Date(),
              });
          }

          await user.save();
      }

      // Return success response
      res.status(200).json({ message: 'Video watched successfully', video });
  } catch (error) {
      // Handle any errors
      console.error(error);
      res.status(500).json({ message: 'Error watching video', error: error.message });
  }
};

const getSuggestedVideos = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Ensure the user ID is valid
    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Log current user ID for debugging
    console.log("Current User ID:", currentUserId);

    // Fetch the user's watched and saved videos
    const user = await User.findById(currentUserId)
      .populate({
        path: 'watchedVideos.video',
        select: 'category tags', // Ensure the references are populated correctly
      })
      .populate({
        path: 'savedVideos',
        select: 'category tags',
      });

    // Ensure watched and saved videos are valid and not null
    if (!user || !user.watchedVideos || !user.savedVideos) {
      return res.status(404).json({ message: 'User data not found' });
    }

    // Extract categories and tags from watched videos, ensuring they are valid
    const watchedCategories = user.watchedVideos
      .filter(video => video.video && video.video.category)
      .map(video => video.video.category);
    const watchedTags = user.watchedVideos
      .filter(video => video.video && video.video.tags)
      .flatMap(video => video.video.tags);

    // Extract categories and tags from saved videos, ensuring they are valid
    const savedCategories = user.savedVideos
      .filter(video => video.category)
      .map(video => video.category);
    const savedTags = user.savedVideos
      .filter(video => video.tags)
      .flatMap(video => video.tags);

    // Find videos based on categories and tags from watched and saved videos
    const suggestedVideos = await Video.find({
      $or: [
        { category: { $in: [...watchedCategories, ...savedCategories] } },
        { tags: { $in: [...watchedTags, ...savedTags] } }
      ],
      user: { $ne: currentUserId } // Exclude videos created by the user
    })
      .sort({ views: -1, createdAt: -1 }) // Sort by popularity and recency
      .limit(10) // Limit to 10 suggestions for efficiency
      .populate('user', 'username profilePic'); // Populate video creator details

    // Fallback: If not enough suggested videos, find popular videos platform-wide
    if (suggestedVideos.length < 10) {
      const popularVideos = await Video.find({ user: { $ne: currentUserId } })
        .sort({ views: -1 })
        .limit(10 - suggestedVideos.length)
        .populate('user', 'username profilePic');
      suggestedVideos.push(...popularVideos);
    }

    res.status(200).json({
      message: 'Suggested videos fetched successfully',
      videos: suggestedVideos,
    });
  } catch (error) {
    console.error("Error fetching suggested videos:", error);
    res.status(500).json({ message: 'Error fetching suggested videos', error: error.message });
  }
};


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



// Remove Following
const removeFollowing = async (req, res) => {
  try {
    const userId = req.user._id; // The logged-in user (assuming req.user is set by middleware)
    const { followingId } = req.params; // The ID of the user being unfollowed

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user is in the following list
    const isFollowing = user.following.includes(followingId);
    if (!isFollowing) {
      return res.status(400).json({ message: 'You are not following this user' });
    }

    // Remove the user from the following list
    user.following.pull(followingId);
    await user.save();

    res.status(200).json({
      message: 'User unfollowed successfully',
      following: user.following, // Updated following list
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  updateProfile,
  uploadProfilePhoto,
  uploadBackgroundImage,
  getProfileById,
  deleteProfile,
  removeBio,
  followUser, 
  unfollowUser,
  getSuggestedVideos,
  watchVideo,
  removeFollower,
  removeFollowing,
  fetchFollowers,
  getFollowedUsersVideos
 };
