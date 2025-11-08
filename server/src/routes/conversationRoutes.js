const express = require("express");
const { requireAuth } = require("../middleware/auth");
const conversationController = require("../controllers/conversationController");
const router = express.Router();

router.get(
  "/",
  requireAuth,
  conversationController.listMyConversations
);

router.post(
  "/",
  requireAuth,
  conversationController.ensureConversation
);

router.get(
  "/:conversationId",
  requireAuth,
  conversationController.getConversationDetail
);

module.exports = router;
