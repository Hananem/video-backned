const express = require('express');
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const upload = require('../config/multer'); // Assuming multer is configured for image uploads
const protect = require('../middleware/authMiddleware');

// Create a category
router.post('/',protect, upload.single('image'), createCategory);

// Get all categories
router.get('/', getAllCategories);

// Get a single category by ID
router.get('/:id', getCategoryById);

// Update a category by ID
router.put('/:id',protect, upload.single('image'), updateCategory);

// Delete a category by ID
router.delete('/:id',protect, deleteCategory);

module.exports = router;
