import logger from "../utils/logger.js";
import {
  validateLogin,
  validateRegistration,
} from "../validation/user.validation.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

// User Registration
const registerUser = async (req, res) => {
  // Implementation for user registration
  logger.info("Registration endpoint hit...");
  try {
    const { error, value } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    // Proceed with registration logic (e.g., save user to database)
    const { username, email, firstName, lastName, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({
      $or: [{ email: email }, { username: username }],
    });
    if (userExists) {
      logger.warn("User Alreaady Exists !!");
      return res.status(409).json({
        success: false,
        message: "This Email Or Username Already Exists",
      });
    }

    // Create User and save to MongoDB
    const newUser = new User({
      username,
      email,
      firstName,
      lastName,
      password,
    });
    await newUser.save();
    logger.info("User Saved Successfully", newUser._id);

    // Generate Access and Refresh Tokens
    const { accessToken, refreshToken } = await generateToken(newUser);

    res.status(201).json({
      success: true,
      message: "User Created Successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration Error Occured", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// User Login
const loginUser = async (req, res) => {
  logger.info("Login endpoint hit...");
  try {
    const { error, _ } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;

    // Check if Account Exists
    const user = await User.findOne({
      email: email,
    });
    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check Password Correctness
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { accessToken, refreshToken } = await generateToken(user);

    res.status(200).json({
      success: true,
      message: "User Signed In Successfully",
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Registration Error Occured", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Refresh Token

// Logout

export { registerUser, loginUser };
