const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const Video = require('../models/Video');
const User = require('../models/User');
const { getIo } = require('../socket');

// Create a comment for a video
const createComment = async (req, res) => {
    try {
      const { text } = req.body; // Comment text from request body
      const { videoId } = req.params; // Video ID from URL params
      const userId = req.user.id; // User ID from authenticated request
  
      // Find the video to ensure it exists
      const video = await Video.findById(videoId);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
  
      // Fetch user details (username and profile photo)
      const user = await User.findById(userId).select('username profilePhoto');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Create the comment
      const comment = new Comment({
        text,
        userId,
        videoId,
        likes: [],
        replies: [],
      });
  
      // Save the comment
      await comment.save();
  
      // Optional: Create a notification if the commenter is not the video's creator
      const videoCreatorId = video.createdBy;
      if (videoCreatorId && !videoCreatorId.equals(userId)) {
        const notification = new Notification({
          recipient: videoCreatorId,
          sender: userId,
          type: 'comment',
          video: videoId,
          comment: comment._id,
          isRead: false,
        });
        await notification.save();
  
        // Emit notification via Socket.IO
        const io = getIo();
        io.to(videoCreatorId.toString()).emit('receiveNotification', notification);
      }
  
      // Push the comment ID into the video's comments array
      video.comments.push(comment._id);
      await video.save();
  
      // Construct the comment response
      const commentResponse = {
        _id: comment._id,
        videoId: comment.videoId,
        userId: {
          _id: user._id,
          username: user.username,
          profilePhoto: user.profilePhoto, // Assuming profilePhoto has `url` and `publicId`
        },
        text: comment.text,
        likes: comment.likes,
        replies: comment.replies,
        createdAt: comment.createdAt,
        __v: comment.__v,
      };
  
      // Send the response with the formatted comment
      res.status(201).json({
        message: 'Comment created successfully',
        comment: commentResponse,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating comment', error: error.message });
    }
  };
  

  
// Get all comments for a video
const getCommentsByVideo = async (req, res) => {
    try {
        const { videoId } = req.params;

        // Ensure the videoId is valid (optional)
        if (!videoId) {
            return res.status(400).json({ message: 'Video ID is required' });
        }

        // Fetch comments for the specified video
        const comments = await Comment.find({ video: videoId }) // Make sure 'video' is the correct field
            .populate('user', 'username') // Populate the user who made the comment
            .populate({
                path: 'replies', // Populate replies
                populate: { path: 'user', select: 'username' }, // Populate the user who made the reply
            })
            .sort({ createdAt: -1 }); // Sort by creation date in descending order

        // Return comments along with a count
        res.status(200).json({ count: comments.length, comments });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching comments', error: error.message });
    }
};


// Update a comment or reply
const updateCommentOrReply = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text } = req.body;

        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Ensure only the comment/reply owner can update it
        if (comment.userId.toString() !== req.user.id) { // Use userId field
            return res.status(403).json({ message: 'Unauthorized to update this comment/reply' });
        }

        // Update the comment text
        comment.text = text;
        await comment.save();

        // Populate the user details and send them in the response
        const updatedComment = await Comment.findById(commentId)
            .populate('userId', 'username profilePhoto'); // Populate user info

        res.status(200).json({
            message: 'Comment/reply updated successfully',
            comment: updatedComment, // Send the updated comment with user info
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating comment/reply', error: error.message });
    }
};


// Delete a comment or reply
const deleteCommentOrReply = async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Ensure only the comment/reply owner can delete it
        if (comment.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to delete this comment/reply' });
        }

        // Remove the comment
        await Comment.findByIdAndDelete(commentId); // This will delete the comment

        // Remove the comment reference from the video if it's a top-level comment
        if (!comment.parentComment) {
            const video = await Video.findById(comment.video);
            if (video) {
                video.comments.pull(comment._id);
                await video.save();
            }
        }

        res.status(200).json({ 
            message: 'Comment/reply deleted successfully',
            commentId
     });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting comment/reply', error: error.message });
    }
};


// Reply to a comment
const replyToComment = async (req, res) => { 
    try {
        const { commentId } = req.params; // Extract the commentId from the request parameters
        const { text } = req.body; // Extract the text from the request body
        const userId = req.user.id; // Get the userId from the authenticated user's request

        // Find the parent comment to get the videoId and userId of the comment owner
        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            return res.status(404).json({ message: 'Parent comment not found' });
        }

        // Create the reply as a comment
        const reply = new Comment({
            text,
            userId, // Use userId field for the reply
            videoId: parentComment.videoId, // Use the videoId from the parent comment
            replies: [], // Initialize replies as an empty array
        });

        await reply.save(); // Save the reply

        // Add the reply to the parent comment
        parentComment.replies.push(reply._id);
        await parentComment.save();

        // Populate user information for the reply
        const populatedReply = await Comment.findById(reply._id)
            .populate('userId', 'username profilePhoto');

        // Create a notification for the user who made the original comment
        if (!parentComment.userId.equals(userId)) { // Avoid notifying the user who replied
            const notification = new Notification({
                recipient: parentComment.userId, // The user who made the original comment
                sender: userId, // The user who is replying
                type: 'reply', // Type of notification
                video: parentComment.videoId, // Optional reference to the video
                comment: parentComment._id, // Reference to the original comment
                isRead: false, // Set as unread
            });
            await notification.save();

            // Emit the notification via Socket.IO
            const io = getIo();
            io.to(parentComment.userId.toString()).emit('receiveNotification', notification);
        }

        // Response with reply and parentCommentId
        res.status(201).json({
            message: 'Reply added successfully',
            reply: populatedReply, // The reply with user information
            parentCommentId: parentComment._id, // Add parentCommentId as a separate property
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding reply', error: error.message });
    }
};



// Toggle like/unlike on a comment
const toggleLikeComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id; // Assuming this is a string

        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Ensure userId comparison uses strings
        const hasLiked = comment.likes.map((like) => like.toString()).includes(userId);

        if (hasLiked) {
            // Unlike the comment
            comment.likes = comment.likes.filter((like) => like.toString() !== userId);
        } else {
            // Like the comment
            comment.likes.push(userId);
        }

        // Create a notification for the user who made the original comment
        if (!comment.userId.equals(userId)) { // Avoid notifying the user who liked their own comment
            const notification = new Notification({
                recipient: comment.userId, // The user who made the original comment
                sender: userId, // The user who is liking
                type: 'like', // Type of notification
                video: comment.videoId, // Reference to the video
                comment: comment._id, // Reference to the liked comment
                isRead: false, // Set as unread
            });
            await notification.save();

            // Emit the notification via Socket.IO
            const io = getIo();
            io.to(comment.userId.toString()).emit('receiveNotification', notification);
        }

        await comment.save();

        // Convert all likes to strings in the response
        res.status(200).json({
            message: hasLiked ? 'Unliked comment' : 'Liked comment',
            likes: comment.likes.map((like) => like.toString()), // Return likes as strings
        });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling like', error: error.message });
    }
};



module.exports = {
    createComment,
    getCommentsByVideo,
    updateCommentOrReply,
    deleteCommentOrReply,
    replyToComment,
    toggleLikeComment,
};