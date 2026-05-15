import logger from "../utils/logger.js";
import {
  validateLogin,
  validateRegistration,
} from "../validation/user.validation.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import RefreshToken from "../models/RefreshToken.js";

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
    logger.error("Login Error Occured", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Refresh Token
const refreshTokenUser = async (req, res) => {
  logger.info("Refresh Token Endpoint Hit ...");
  try {
    // Get your refresh Token
    const { refreshToken } = req.body;
    // if refresh token missing Error 400
    if (!refreshToken) {
      logger.warn("Refresh Token Missing in Request Body");
      return res.status(400).json({
        success: false,
        message: "Refresh Token is required",
      });
    }
    // Check your stored Token if exists or  Expired -> Logged warning and 401 Error
    const storedRefreshToken = await RefreshToken.findOne({
      token: refreshToken,
    });

    if (!storedRefreshToken || storedRefreshToken.expiresAt < new Date()) {
      logger.warn(
        `Refresh Token (${storedRefreshToken.token}) Doesn't Exists or Expired`,
      );
      return res.status(400).json({
        success: false,
        message: "Refresh Token doesn't Exist or Expired",
      });
    }
    // Check if token's user still exists
    const user = await User.findById(storedRefreshToken.user);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Refresh Token's user doesn't exist",
      });
    }
    // if exists -> generate a new token
    const { accessToken: newAcessToken, refreshToken: newRefreshToken } =
      await generateToken(user);
    logger.info(`Generated new Refresh and Access Token for user: ${user._id}`);
    
    // Delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedRefreshToken._id });
    
    return res.status(201).json({
      success: true,
      message: "User Generated new Refresh Token Successfully",
      newAcessToken,
      newRefreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Refresh Token Generation Error Occured", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Logout
const logoutUser = async (req, res) => {
  logger.info("Logout Endpoint Hit ...");
  try {
    // Check if refresh token existed in req.body
    // Delete refresh token from database
  } catch (error) {
    logger.error("Refresh Token Generation Error Occured", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export { registerUser, loginUser, refreshTokenUser, logoutUser };
