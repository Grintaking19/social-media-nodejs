import logger from "../utils/logger.js";

const authenticateRequest = (req, res, next) => {
  // Get userId
  const userId = req.header("x-user-id");
  // if doesn't exists => log error in request and logger
  if (!userId) {
    logger.warn("Unauthorized request: Missing x-user-id header");
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Missing x-user-id header",
    });
  }
  // Assign userId to the request
  req.userId = userId;

  next();
};

export default authenticateRequest;
