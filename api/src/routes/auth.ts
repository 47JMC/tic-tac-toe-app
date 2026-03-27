import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

type User = {
  id: string;
  username: string;
  avatar: string;
};

router.get("/login", (req, res) => {
  const { CLIENT_ID, REDIRECT_URI } = process.env;

  if (!CLIENT_ID || !REDIRECT_URI) {
    return res.status(500).json({ error: "Client ID or Redirect_URI not set" });
  }

  res.redirect(
    `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=identify`,
  );
});

router.get("/callback", async (req, res) => {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, JWT_SECRET, FRONTEND_URL } =
    process.env;

  if (
    !CLIENT_ID ||
    !CLIENT_SECRET ||
    !REDIRECT_URI ||
    !JWT_SECRET ||
    !FRONTEND_URL
  ) {
    return res.status(500).json({
      error: "Client ID, Client Secret, Redirect URI or Frontend URL not set",
    });
  }

  const { code } = req.query;

  if (!code)
    return res.status(400).json({ error: "Authorization code not provided" });

  const oauthRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code: code.toString(),
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!oauthRes.ok) {
    res.status(500).json({ error: "Failed to exchange code for token" });
    return;
  }

  const { access_token } = await oauthRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!userRes.ok) {
    res.status(500).json({ error: "Failed to fetch user info" });
    return;
  }

  const userInfo = (await userRes.json()) as User;

  const existingUser = await User.findOne({ id: userInfo.id });

  if (!existingUser) {
    const newUser = new User({
      id: userInfo.id,
      username: userInfo.username,
      avatar: userInfo.avatar,
    });
    await newUser.save();
  } else {
    existingUser.username = userInfo.username;
    existingUser.avatar = userInfo.avatar;
    await existingUser.save();
  }

  // Create JWT
  const token = jwt.sign(
    { id: userInfo.id, avatar: userInfo.avatar },
    JWT_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
    },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.redirect(FRONTEND_URL); // Redirect to frontend after login
});

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

export async function verifyToken(token: string) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      avatar: string;
    };
    const user = await User.findOne({ id: decoded.id }).lean();
    return user ?? null;
  } catch {
    return null;
  }
}

router.get("/me", async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    res.status(500).send("environment variables not set");
    return;
  }

  const token = req.cookies.token as string;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const user = await verifyToken(token);

  if (!user) res.status(401).send("Unauthorised");

  res.json(user);
});

export default router;
