const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },
    senderId: {
        type: String, // Clerk user id
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    senderAvatar: {
        type: String,
        default: ""
    },
    text: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent"
    },
    readBy: {
        type: [String],
        default: []
    }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
