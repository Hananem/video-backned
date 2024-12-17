const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerSchema, loginSchema } = require('../validation/authValidation');

// Register Controller
const registerUser = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      token,
      id: user._id,
      username: user.username,
      email: user.email,
      following: user.following,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


// Login Controller
const loginUser = async (req, res) => {
  try {
    // Validate input data using the provided loginSchema
    const { email, password } = await loginSchema.validateAsync(req.body);

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Verify the password using the matchPassword method in the User model
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Prepare the user object to exclude sensitive information
    const { password: _, ...userWithoutPassword } = user.toObject();

    // Return the user object and token in the response
    res.status(200).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error(error);

    if (error.isJoi) {
      // Handle Joi validation errors
      return res.status(400).json({ message: error.details[0].message });
    }

    // Handle other errors
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerUser, loginUser };
