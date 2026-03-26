import "dotenv/config";

import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { initSocket } from "./socket.js";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth.js";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", credentials: true },
});

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

mongoose.connect(process.env.MONGODB_URI);
initSocket(io);

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.use("/auth", authRouter);

server.listen(4000, () => {
  console.log("Server is running on http://localhost:4000");
});
