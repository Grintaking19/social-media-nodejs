import logger from "../utils/logger.js";

const createPost = async (req, res) => {
  try {
    // fetch content and mediaIDs from req
    // create a new Post
  } catch (error) {
    logger.error("Error Creating Post", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error fetching Posts", error);
    res.status(500).json({
      success: false,
      message: "Error fetching Posts",
    });
  }
};

const getPost = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error fetching Post by ID", error);
    res.status(500).json({
      success: false,
      message: "Error fetching Post by ID",
    });
  }
};

const deletePost = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error Deleteing Post", error);
    res.status(500).json({
      success: false,
      message: "Error Deleting Post",
    });
  }
};

export { createPost, getAllPosts, getPost, deletePost };
