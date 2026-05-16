import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    mediaIDs: {
        type: [String],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
  },
  { timestamps: true },
);

// Remove when you create search service in the future
postSchema.index({ content: "text" });
const Post = mongoose.model("Post", postSchema);

export default Post;
