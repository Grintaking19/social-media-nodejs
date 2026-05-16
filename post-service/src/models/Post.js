import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    // user -> ref to 'User' Model/ type is ObjectId
    // content -> String
    // mediaUrls -> array of strings [some requirements will be added in the future]
    // CreatedAt
  },
  { timestamps: true },
);

// Remove when you create search service in the future
postSchema.index({ content: "text" });
const Post = mongoose.model("Post", postSchema);

export default Post;
