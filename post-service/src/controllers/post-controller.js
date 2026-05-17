import logger from "../utils/logger.js";
import Post from "../models/Post.js";
const createPost = async (req, res) => {
  try {
    // fetch content and mediaIDs from req
    const { content, mediaIDs } = req.body;
    // create a new Post
    const newPost = await Post.create({
      user: req.user.userId,
      content,
      mediaIDs: mediaIDs || [],
    });
    logger.info("Post Created Successfully", newPost);
    res.status(201).json({
      success: true,
      message: "Post Created Successfully",
    });
  } catch (error) {
    logger.error("Error Creating Post", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

// Implement Post Fetching
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

// Implement Post Deletion
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
