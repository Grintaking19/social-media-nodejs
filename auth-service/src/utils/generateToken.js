import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";
import redisClient from "../database/redisClient.js";

const generateToken = async (user, family = null, oldToken = null) => {
  // -- Access Token ---------
  const jti = crypto.randomUUID();

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN,
  };

  const payload = {
    userId: user._id,
    username: user.username,
    jti,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, options);

  // -- Refresh Token ---------
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenFamily = family ?? crypto.randomUUID();

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

  // Save Refresh Token in MongoDB
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt: expiresAt,
    family: refreshTokenFamily,
  });

  // -- Record rotated token in redis -----------
  // When a token is rotated, we keep a short-lived redis record mapping
  // oldToken -> family. If that alread-deleted token shows up again.
  // we can still find its family and nuke the entire session.
  // 24 TTL is enough to cover network retires and a meaningful theft window

  if (oldToken && family) {
    await redisClient.set(
      `rotated_refresh:${oldToken}`,
      refreshTokenFamily,
      { EX: 60 * 60 * 24 }, // 24 hours
    );
  }
  return { accessToken, refreshToken, family: refreshTokenFamily };
};

export default generateToken;
