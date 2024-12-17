const multer = require('multer');
const path = require('path');

// Configure multer storage and file type restrictions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images');  // Store the file temporarily on the local file system before uploading to Cloudinary
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Unique file name
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // Max file size 5MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const isValidMimeType = fileTypes.test(file.mimetype);
    const isValidExtname = fileTypes.test(path.extname(file.originalname).toLowerCase());

    if (isValidMimeType && isValidExtname) {
      return cb(null, true);  // Accept the file
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

module.exports = upload;
