import logger from "../utils/logger.js";
import jwt from "jsonwebtoken";
const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Access attempt without valid token!");
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  // Check if the token is blacklisted in Redis
  redisClient.get(`blacklist_access:${token}`, (err, result) => {
    if (err) {
      logger.error("Redis error while checking token blacklist:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
    if (result) {
      logger.warn("Blacklisted token used for access attempt");
      return res.status(401).json({
        success: false,
        message: "Token has been revoked. Please login again.",
      });
    }
  });

  // Verify the token using the secret key
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn(`Invalid token provided: ${err.message}`);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
    req.user = user;
    next();
  });

  
};

export default validateToken;
