const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: Object,
      default: {
        url: 'https://example.com/default-category-image.jpg', // Default category image
        publicId: null,
      },
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
