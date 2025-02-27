import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["direct", "group", "channel"],
      default: "group",
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "moderator", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        lastRead: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    metadata: {
      description: String,
      avatar: String,
      customData: Map,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    settings: {
      slowMode: {
        enabled: Boolean,
        delay: Number,
      },
      notifications: {
        enabled: Boolean,
        mentionsOnly: Boolean,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

chatRoomSchema.index({ "participants.userId": 1 });
chatRoomSchema.index({ type: 1 });
chatRoomSchema.index({ isPrivate: 1 });
chatRoomSchema.index({ updatedAt: -1 });

export const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
