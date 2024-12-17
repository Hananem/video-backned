const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Check if category name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    let image = {
      url: 'https://example.com/default-category-image.jpg',
      publicId: null,
    };

    // If an image is uploaded, upload it to Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'categories',
      });
      image = { url: result.secure_url, publicId: result.public_id };
    }

    const category = new Category({ name, image });
    await category.save();

    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update category by ID
const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) category.name = name;

    // If an image is uploaded, replace the existing one
    if (req.file) {
      if (category.image.publicId) {
        await cloudinary.uploader.destroy(category.image.publicId);
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'categories',
      });
      category.image = { url: result.secure_url, publicId: result.public_id };
    }

    const updatedCategory = await category.save();
    res.status(200).json({ message: 'Category updated successfully', updatedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Delete category by ID
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Delete image from Cloudinary
    if (category.image.publicId) {
      await cloudinary.uploader.destroy(category.image.publicId);
    }

    // Delete the category using deleteOne()
    await Category.deleteOne({ _id: req.params.id });

    res.status(200).json({
      message: 'Category deleted successfully',
      categoryId: category._id, // Return the category ID
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};


module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
