const mongoose = require("mongoose");
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    name: { type: String },
    isGroup: { type: Boolean, default: false },
    adminId: { type: String },
    members: [
      {
        type: String, // Clerk user IDs
        required: true
      }
    ],
    lastMessage: {
      text: String,
      senderId: String,
      senderName: String,
      senderAvatar: String,
      createdAt: Date
    },
    lastMessageAt: { type: Date },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true }
);

conversationSchema.index({ members: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;
