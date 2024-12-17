const express = require('express');
const multer = require('multer');
const videoController = require('../controllers/videoController');
const protect = require('../middleware/authMiddleware');
const path = require('path');

// Set up multer to handle video and thumbnail uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      'image/jpeg', 'image/png', 'image/jpg'  // Allowed image types for thumbnail
    ];

    const allowedExtensions = [
      '.mp4', '.mov', '.avi', '.webm', '.jpg', '.jpeg', '.png'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
    const isAllowedExtension = allowedExtensions.includes(fileExtension);

    if (isAllowedMimeType && isAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const router = express.Router();

// The route to upload a video and its thumbnail
router.post('/upload', protect, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), videoController.uploadVideo);

router.put('/update/:videoId', protect, (req, res, next) => {
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ])(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Multer error occurred', error: err.message });
    } else if (err) {
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    next();
  });
}, videoController.updateVideo);

router.get('/all', videoController.getAllVideos);

// Get video by ID route
router.get('/:id', videoController.getVideoById);

// DELETE video by ID route
router.delete('/:id', protect, videoController.deleteVideo);

// Add or remove a reaction to/from a video
router.post('/:videoId/reactions', protect, videoController.toggleReaction);

// Route to toggle save for a video
router.post('/:videoId/save', protect, videoController.saveToggle);

// Route to update the privacy status of a video
router.put('/:videoId/privacy', protect, videoController.updatePrivacyStatus);

router.get('/user/:userId', protect, videoController.getVideosByUser);

// Route to get videos by category
router.get('/category/:categoryId', videoController.getVideosByCategory);

// Route to get videos by tag
router.get('/videos/tag/:tag',  videoController.getVideosByTag);

// Route to search both users and videos
router.get('/', videoController.globalSearch);
module.exports = router;

