import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "emoji", "image"],
      default: "text",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
export const Message = mongoose.model("Message", messageSchema);