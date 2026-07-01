import logger from "../utils/logger.js";
import {
  validateLogin,
  validateRegistration,
} from "../validation/user.validation.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import RefreshToken from "../models/RefreshToken.js";
import redisClient from "../database/redisClient.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ----------------------------------------
// USER REGISTRATION
// ----------------------------------------
const registerUser = async (req, res) => {
  logger.info("Register endpoint hit...");
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
      logger.warn(
        `Registration failed - email or username already exists : ${email} | ${username}`,
      );
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
    logger.info(`User registered — id: ${newUser._id}`);
    // Generate Access and Refresh Tokens
    const { accessToken, refreshToken } = await generateToken(newUser);

    res.status(201).json({
      success: true,
      message: "User Created Successfully",
      accessToken,
      refreshToken,
      userId: newUser._id,
    });
  } catch (error) {
    logger.error("Registration Error Occured", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ----------------------------------------
// USER LOGIN
// ----------------------------------------
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
      logger.warn(`Login failed - email not found : ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check Password Correctness
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn(`Login failed — wrong password for: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Each login starts a BRAND NEW family - Fresh Session
    // Indepentant from any prev session
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

// ----------------------------------------
// REFRESH TOKEN
// ----------------------------------------
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
    const hashToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
    
    const storedRefreshToken = await RefreshToken.findOne({
      hashToken: hashToken,
    });

    if (!storedRefreshToken) {
      logger.warn(
        `Refresh Token (${refreshToken}) Doesn't Exists or Expired`,
      );
      // Chech if this is a recently rotated token whose family we stored in Redis
      const oldTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      const family = await redisClient.get(`rotated_refresh:${oldTokenHash}`);
      if (family) {
        const deleted = await RefreshToken.deleteMany({ family });
        logger.warn(
          `🚨 Token reuse detected — family: ${family} | purged ${deleted.deletedCount} token(s)`,
        );
        await redisClient.del(`rotated_refresh:${oldTokenHash}`);
        
        // Blacklist the access token if provided and valid
        if (accessToken) {
          try {
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
            const jti = decoded.jti;
            // Store the jti in Redis with a TTL equal to the remaining time of the token
            const expiresIn = decoded.exp * 1000 - Date.now();
            if (expiresIn > 0) {
              await redisClient.set(`blacklist_access:${jti}`, "true", {
                EX: Math.ceil(expiresIn / 1000),
              });
              logger.info(
                `Access token blacklisted because of refresh token reuse until ${new Date(decoded.exp * 1000)}`,
              );
            }
          } catch (err) {
            logger.warn(
              "Invalid access token provided during refresh token reuse, skipping blacklist",
            );
          }
        }

      } else {
        // if Token not in MongoDB or Redis - Completely unkown token
        logger.warn(`Unkown Refresh Token Attempt: ${refreshToken}`); // This could be a sign of attack or misuse
      }
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
      });
    }

    // -- Token found, but expired -------
    if (storedRefreshToken.expiresAt < new Date()) {
      logger.warn(
        `Refresh Token (${storedRefreshToken.hashToken}) Expired at ${storedRefreshToken.expiresAt}`,
      );
      await RefreshToken.deleteOne({ _id: storedRefreshToken._id }); // Clean up expired token
      return res.status(401).json({
        success: false,
        message: "Refresh Token expired. Please log in again.",
      });
    }

    // Check if token's user still exists
    const user = await User.findById(storedRefreshToken.user);
    if (!user) {
      await RefreshToken.deleteMany({ family: storedRefreshToken.family }); // Clean up all tokens from this family
      logger.warn(
        `Refresh Token's user doesn't exist anymore. Token family (${storedRefreshToken.family}) has been purged.`,
      );
      return res.status(401).json({
        success: false,
        message:
          "User associated with this token no longer exists. Please log in again.",
      });
    }

    // -- Rotate Token:
    // --- Generate new access and refresh tokens, keeping the same family chain
    // --- If successful, delete the old refresh token to prevent reuse
    

    const { accessToken, refreshToken: newRefreshToken } = await generateToken(
      user,
      storedRefreshToken.family, // keep the same family chain
      refreshToken, // old token → stored in Redis for 24h for reuse detection
    );

    await RefreshToken.deleteOne({ _id: storedRefreshToken._id }); // Delete the old refresh token to prevent reuse

    logger.info(
      `Tokens rotated — user: ${user._id} | family: ${storedRefreshToken.family}`,
    );

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
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

// ----------------------------------------
// USER LOGOUT
// ----------------------------------------
const logoutUser = async (req, res) => {
  logger.info("Logout Endpoint Hit ...");
  try {
    // Check if refresh token existed in req.body
    const { refreshToken, accessToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh Token Missing in Request Body");
      return res.status(400).json({
        success: false,
        message: "Refresh Token is required",
      });
    }

    // Hash the refresh token to match the stored hash
    const hashToken = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // -- Delete refresh token from database
    await RefreshToken.deleteOne({ hashToken });
    logger.info(`Refresh token deleted for logout`);

    // -- Blacklist Access Token by its jti (if provided) --
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const jti = decoded.jti;
        // Store the jti in Redis with a TTL equal to the remaining time of the token
        const expiresIn = decoded.exp * 1000 - Date.now();
        if (expiresIn > 0) {
          await redisClient.set(`blacklist_access:${jti}`, "true", {
            EX: Math.ceil(expiresIn / 1000),
          });
          logger.info(
            `Access token blacklisted until ${new Date(decoded.exp * 1000)}`,
          );
        }
      } catch (err) {
        logger.warn(
          "Invalid access token provided during logout, skipping blacklist",
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "User Logged out Successfully.",
    });
  } catch (error) {
    logger.error("Refresh Token Generation Error Occured", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export { registerUser, loginUser, refreshTokenUser, logoutUser };
