// controllers/videoController.js
const cloudinary = require('../config/cloudinary');
const Video = require('../models/Video');
const User = require('../models/User');
const Comment = require('../models/Comment');
const streamifier = require('streamifier');
const mongoose = require('mongoose');
const uploadVideo = async (req, res) => {
  try {
    const { title, description, tags, category, privacyStatus } = req.body;

    // Validate files
    const videoFile = req.files.video?.[0];
    const thumbnailFile = req.files.thumbnail?.[0];

    if (!videoFile || !thumbnailFile) {
      return res.status(400).json({ message: 'Video and thumbnail files are required' });
    }

    // Helper to upload files to Cloudinary
    const uploadToCloudinary = (fileBuffer, options) => {
      return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(options, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        streamifier.createReadStream(fileBuffer).pipe(upload);
      });
    };

    // Upload video to Cloudinary
    const videoResult = await uploadToCloudinary(videoFile.buffer, {
      resource_type: 'video',
      public_id: `video_${Date.now()}`,
    });

    // Upload thumbnail to Cloudinary
    const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, {
      resource_type: 'image',
      public_id: `thumbnail_${Date.now()}`,
    });

    // Create a new Video document
    const newVideo = new Video({
      title,
      description,
      tags: tags?.split(',') || [], // Convert comma-separated tags to an array
      category: category || null,
      privacyStatus: privacyStatus || 'public', // Default privacy status
      videoUrl: videoResult.secure_url, // Cloudinary URL for the video
      thumbnailUrl: thumbnailResult.secure_url, // Cloudinary URL for the thumbnail
      cloudinaryVideoId: videoResult.public_id, // Cloudinary ID for video
      cloudinaryThumbnailId: thumbnailResult.public_id, // Cloudinary ID for thumbnail
      duration: videoResult.duration || null, // Video duration in seconds
      user: req.user._id, // Set uploader's user ID
    });

    // Save the video document
    const savedVideo = await newVideo.save();

    // Update the user's `videos` array by pushing the new video
    await User.findByIdAndUpdate(req.user._id, {
      $push: { videos: savedVideo._id },
    });

    res.status(201).json({
      message: 'Video and thumbnail uploaded successfully',
      video: savedVideo,
    });
  } catch (error) {
    console.error('Error uploading video and thumbnail:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};



const updateVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description, tags, category, privacyStatus } = req.body;

    // Validate if the video exists
    const existingVideo = await Video.findById(videoId);
    if (!existingVideo) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Update video file if provided
    const videoFile = req.files?.video?.[0];
    if (videoFile) {
      // Delete old video from Cloudinary
      if (existingVideo.cloudinaryVideoId) {
        await cloudinary.uploader.destroy(existingVideo.cloudinaryVideoId, {
          resource_type: 'video',
        });
      }

      // Upload new video
      const videoResult = await new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { resource_type: 'video', public_id: `video_${Date.now()}` },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(videoFile.buffer).pipe(upload);
      });

      // Update video details in the database
      existingVideo.videoUrl = videoResult.secure_url;
      existingVideo.cloudinaryVideoId = videoResult.public_id;
      existingVideo.duration = videoResult.duration;
    }

    // Update thumbnail file if provided
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile) {
      // Delete old thumbnail from Cloudinary
      if (existingVideo.cloudinaryThumbnailId) {
        await cloudinary.uploader.destroy(existingVideo.cloudinaryThumbnailId, {
          resource_type: 'image',
        });
      }

      // Upload new thumbnail
      const thumbnailResult = await new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { resource_type: 'image', public_id: `thumbnail_${Date.now()}` },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(thumbnailFile.buffer).pipe(upload);
      });

      // Update thumbnail details in the database
      existingVideo.thumbnailUrl = thumbnailResult.secure_url;
      existingVideo.cloudinaryThumbnailId = thumbnailResult.public_id;
    }

    // Update other metadata fields
    if (title) existingVideo.title = title;
    if (description) existingVideo.description = description;
    if (tags) existingVideo.tags = tags.split(',');
    if (category) existingVideo.category = category;
    if (privacyStatus) existingVideo.privacyStatus = privacyStatus;

    // Save the updated video document
    const updatedVideo = await existingVideo.save();

    res.status(200).json({
      message: 'Video updated successfully',
      video: updatedVideo,
    });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};


const getAllVideos = async (req, res) => {
  try {
    // Fetch all videos and populate user details (username and profilePhoto)
    const videos = await Video.find().populate('user', 'username profilePhoto');

    res.status(200).json({
      message: 'Videos retrieved successfully',
      videos,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve videos',
      error: error.message || error,
    });
  }
};


  
  const getVideoById = async (req, res) => {
    const { id } = req.params; // Video ID from the request URL parameter
  
    try {
      // Find the video by ID and populate the necessary fields
      const video = await Video.findById(id)
        .populate('user', 'username profilePhoto followers') // Populate only the uploader's details
        .populate('category', 'name image') // Populate category name and image
        .populate({
          path: 'comments', // Populate comments
          populate: [
            {
              path: 'userId',
              select: 'username profilePhoto', // Populate username and profilePhoto for comment authors
            },
            {
              path: 'replies', // Populate replies within comments
              populate: {
                path: 'userId',
                select: 'username profilePhoto', // Populate username and profilePhoto for reply authors
              },
            },
          ],
        })
        .exec();
  
      // Handle video not found
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
  
      // Return the video with populated fields
      return res.status(200).json(video);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  
  
  
  const deleteVideo = async (req, res) => {
    try {
      const { id } = req.params; // Get video ID from URL parameter
  
      // Find the video by ID and remove it
      const video = await Video.findById(id);
  
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
  
      // Optionally, check if the user is the owner of the video
      if (video.user.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this video' });
      }
  
      // Delete the video from the database
      await Video.findByIdAndDelete(id);
  
      // Respond with success message including videoId
      res.status(200).json({
        message: 'Video deleted successfully',
        videoId: id, // Including the deleted video ID in the response
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to delete video',
        error: error.message || error,
      });
    }
  };
  
const toggleReaction = async (req, res) => {
  try {
      const { videoId } = req.params;
      const { type } = req.body; // Reaction type: 'like', 'love', 'haha', 'angry', 'sad'
      const userId = req.user._id; // Authenticated user ID

      const trimmedVideoId = videoId.trim();

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(trimmedVideoId)) {
          return res.status(400).json({ message: 'Invalid video ID' });
      }

      const video = await Video.findById(trimmedVideoId);

      if (!video) {
          return res.status(404).json({ message: 'Video not found' });
      }

      // Reaction logic remains unchanged...
      const existingReaction = video.reactions.find(
          (reaction) => reaction.userId.equals(userId)
      );

      if (existingReaction) {
          if (existingReaction.type === type) {
              video.reactions = video.reactions.filter(
                  (reaction) => !reaction.userId.equals(userId)
              );
              video.reactionCount -= 1;
              await video.save();

              return res.status(200).json({ message: 'Reaction removed', video });
          } else {
              existingReaction.type = type;
              await video.save();

              return res.status(200).json({ message: 'Reaction updated', video });
          }
      } else {
          video.reactions.push({ userId, type });
          video.reactionCount += 1;
          await video.save();

          return res.status(200).json({ message: 'Reaction added', video });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error toggling reaction', error: error.message });
  }
};

const saveToggle = async (req, res) => {
  try {
      const { videoId } = req.params; // Extract videoId from request parameters
      const userId = req.user.id; // Get user ID from the request

      const user = await User.findById(userId);
      const video = await Video.findById(videoId);

      if (!user || !video) {
          return res.status(404).json({ message: 'User or Video not found' });
      }

      // Check if the video is already saved by the user
      const hasSaved = user.savedVideos.includes(videoId);

      if (hasSaved) {
          // Unsaving the video
          user.savedVideos.pull(videoId);
      } else {
          // Saving the video
          user.savedVideos.push(videoId);
      }

      await user.save(); // Save the updated user data

      res.status(200).json({
          message: hasSaved ? 'Video unsaved' : 'Video saved',
          savedVideos: user.savedVideos,
      });
  } catch (error) {
      res.status(500).json({ message: 'Error toggling save', error: error.message });
  }
}

const updatePrivacyStatus = async (req, res) => {
  try {
      const { videoId } = req.params;
      const { privacyStatus } = req.body;
      const validPrivacyStatuses = ['public', 'private', 'follower'];

      // Ensure user is authenticated
      if (!req.user || !req.user._id) {
          return res.status(401).json({ message: 'Not authorized, no user found' });
      }

      // Validate privacyStatus
      if (!validPrivacyStatuses.includes(privacyStatus)) {
          return res.status(400).json({ message: 'Invalid privacy status' });
      }

      // Find the video by ID
      const video = await Video.findById(videoId);

      if (!video) {
          return res.status(404).json({ message: 'Video not found' });
      }

      // Check if the current user is the creator of the video
      if (video.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Unauthorized to update this video' });
      }

      // Update the privacyStatus
      video.privacyStatus = privacyStatus;
      await video.save();

      res.status(200).json({
          message: 'Privacy status updated successfully',
          video: {
              _id: video._id,
              title: video.title,
              privacyStatus: video.privacyStatus,
              updatedAt: video.updatedAt,
          },
      });
  } catch (error) {
      console.error('Error updating privacy status:', error);
      res.status(500).json({ message: 'Error updating privacy status', error: error.message });
  }
};

const getVideosByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const videos = await Video.find({ category: categoryId })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    if (videos.length === 0) {
      return res.status(404).json({ message: 'No videos found for this category' });
    }

    res.status(200).json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

const getVideosByTag = async (req, res) => {
  try {
    const tag = req.params.tag; // Extract the tag from request parameters
    const videos = await Video.find({ tags: tag })
      .populate('user', 'username') // Populate the user field with username only
      .populate('category', 'name') // Populate the category field with name only
      .sort({ createdAt: -1 }) // Sort videos by newest first
      .select('title videoUrl thumbnailUrl duration views tags createdAt'); // Select required fields

    if (videos.length === 0) {
      return res.status(404).json({ message: 'No videos found for this tag' });
    }

    res.status(200).json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get videos by user ID
const getVideosByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find the user to ensure they exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get videos by userId (populate if you want more details)
    const videos = await Video.find({ user: userId });

    // Return videos
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos by user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search users and videos by user or title
const globalSearch = async (req, res) => {
  const { query } = req.query;

  // If no query parameter is provided, return an error
  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    // User search
    const userResults = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } },
      ]
    }).select('username email bio profilePhoto');

    // Video search
    const videoResults = await Video.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }, // Assuming tags is an array
      ]
    }).select('title description thumbnailUrl duration views');

    // Return search results
    res.status(200).json({
      users: userResults,
      videos: videoResults,
    });
  } catch (err) {
    console.error('Error in globalSearch:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};


module.exports = { 
  uploadVideo,
    getAllVideos,
    getVideoById,
    deleteVideo,
    saveToggle,
    toggleReaction,
    updateVideo,
    updatePrivacyStatus,
    getVideosByCategory,
    getVideosByUser,
    getVideosByTag,
    globalSearch
 };
