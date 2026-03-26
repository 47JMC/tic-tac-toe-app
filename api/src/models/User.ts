import { Schema, model } from "mongoose";

const userSchema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  avatar: { type: String, required: true },
});

export default model("User", userSchema);
