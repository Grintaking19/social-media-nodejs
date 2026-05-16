import logger from "../utils/logger.js";

const authenticateRequest = (req, res, next) => {
  const userId = req.header("x-user-id");

  if (!userId) {
    logger.warn("Unauthorized: Access Attemped without user ID");
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Please Login to continue",
    });
  }
  // Assign userId to the request
  req.user = { userId };

  next();
};

export default authenticateRequest;
