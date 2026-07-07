import logger from "../utils/logger.js";
import jwt from "jsonwebtoken";
import redisClient from "../database/redisClient.js";

const validateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Access attempt without valid token!");
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);

    // Check the JWT id (jti), not the raw token string.
    const isBlacklisted = await redisClient.get(`blacklist_access:${user.jti}`);

    if (isBlacklisted) {
      logger.warn("Blacklisted token used for access attempt");
      return res.status(401).json({
        success: false,
        message: "Token has been revoked. Please login again.",
      });
    }

    req.user = user;
    return next();
  } catch (err) {
    logger.warn(`Invalid token provided: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default validateToken;
