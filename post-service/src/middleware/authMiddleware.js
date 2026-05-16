import logger from "../utils/logger.js";

const authenticateRequest = (req, res, next) => {
  // Get userId
  const userId = req.header("x-user-id");
  // if doesn't exists => log error in request and logger
  if (!userId) {
    logger.warn("Unauthorized: Please Login to continue");
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
