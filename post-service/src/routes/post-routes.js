import express from "express";
import {createPost, getAllPosts, getPost, deletePost} from "../controllers/post-controller.js";
const router = express.Router();


router.post("/")