import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    roomId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "emoji", "image"],
      default: "text",
    },
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model("Message", messageSchema);
