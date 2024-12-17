const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: String,
  videoUrl: String,
  cloudinaryId: String,
  description: { type: String, required: true }, // Add description field
  tags: { type: [String], required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', 
    default: null,  // Reference to the Category model
  },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],

reactions: [{
  type: {
      type: String,
      enum: ['like', 'love', 'haha', 'angry', 'sad'],
      required: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}],
privacyStatus: {
  type: String,
  enum: ['public', 'private', 'follower'],
  default: 'public'
},
thumbnailUrl: { type: String },  // Add this field for the thumbnail URL
cloudinaryThumbnailId: { type: String },
duration: { type: Number, required: true },
views: { type: Number, default: 0 },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // references the User model
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
