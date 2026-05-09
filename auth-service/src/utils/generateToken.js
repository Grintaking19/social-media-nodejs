import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";

const generateToken = async (user) => {
  // Generate Access Token
  const JWT_SECRET = process.env.JWT_SECRET;
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN,
  };
  const payload = {
    userId: user._id,
    username: user.username,
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, options);

  // Generate Refresh Token
  const refreshToken = crypto.randomBytes(40).toString("hex");

  // Save Refresh Token in MongoDB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt: expiresAt,
  });

  return { accessToken, refreshToken };
};

export default generateToken;
