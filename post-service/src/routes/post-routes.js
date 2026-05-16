import express from "express";
import {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
} from "../controllers/post-controller.js";
import authenticateRequest from "../middleware/authMiddleware.js";
const router = express.Router();

// Use Must be authenticated to access this router
router.use(authenticateRequest);

// Post Routes
router.post("/create-post", createPost);

export default router;
