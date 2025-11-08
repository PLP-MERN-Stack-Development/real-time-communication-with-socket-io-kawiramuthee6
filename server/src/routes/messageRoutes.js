const express = require("express");
const { requireAuth } = require("../middleware/auth");
const messageController = require("../controllers/messageController");
const router = express.Router();

router.get(
  "/:conversationId",
  requireAuth,
  messageController.getMessagesForConversation
);

router.post(
  "/",
  requireAuth,
  messageController.sendMessage
);

module.exports = router;
