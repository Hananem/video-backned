const express = require('express');
const { getFollowedUsersVideos } = require('../controllers/followedController');
const protect = require('../middleware/authMiddleware');
const router = express.Router();


router.get('/', protect, getFollowedUsersVideos);

module.exports = router;