// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
},
isOnline: { type: Boolean, default: false },
  backgroundImage: {  
    type: Object,
    default: {
      url: "https://example.com/default-background-image.jpg",  // Default background image
      publicId: null,
    }
  },
  profilePhoto: {
    type: Object,
    default: {
        url: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__480.png",
        publicId: null,
    }
},
videos: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Video',  // Reference to the Video model
}],
followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
savedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
watchedVideos: [
    {
        video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
        lastWatchedAt: { type: Date, default: Date.now }
    }
],
notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
