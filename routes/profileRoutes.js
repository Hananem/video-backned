const express = require('express');
const { 
    updateProfile,
    uploadProfilePhoto,
    uploadBackgroundImage,
    getProfileById,
    deleteProfile,
    removeBio,
    followUser, 
    unfollowUser,
    getFollowedUsersVideos,
    getSuggestedVideos,
    removeFollower,
    removeFollowing,
    fetchFollowers,
    watchVideo
 } = require('../controllers/profileController'); // Correctly link the controller
const protect = require('../middleware/authMiddleware'); // Ensure the middleware is implemented correctly
const upload = require('../config/multer'); 
const router = express.Router();

// Example route for updating profile
router.put('/update', protect, updateProfile);

// Route to handle profile photo upload
router.post('/upload-profile-photo', protect, upload.single('profilePhoto'), uploadProfilePhoto);

// Route for uploading background image
router.post('/upload-background-image', protect, upload.single('backgroundImage'), uploadBackgroundImage);


 // Protect the route with the authentication middleware
 router.get('/:id', getProfileById);
 // Protect the route with the authentication middleware

// Route to delete user profile
router.delete('/', protect, deleteProfile);

// Route to remove user bio
router.patch('/remove-bio', protect, removeBio);

// Follow a user
router.post('/follow/:userId', protect, followUser);

// Unfollow a user
router.post('/unfollow/:userId', protect, unfollowUser);

// Route for getting suggested videos
router.get('/', protect, getSuggestedVideos);

//route for watchVideo
router.post('/watch/:videoId', protect, watchVideo);

// Route to fetch followers of a user
router.get('/:userId/followers', protect, fetchFollowers);

// Route to remove a follower
router.delete('/remove-follower/:followerId', protect, removeFollower);

// Route to remove a following
router.delete('/remove-following/:followingId', protect, removeFollowing);
module.exports = router;
