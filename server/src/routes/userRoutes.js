const express = require("express");
const { requireAuth } = require("../middleware/auth");
const userController = require("../controllers/userController");
const router = express.Router();

router.get(
  "/",
  requireAuth,
  userController.listUsers
);

router.post(
  "/sync",
  requireAuth,
  userController.syncProfile
);

module.exports = router;
