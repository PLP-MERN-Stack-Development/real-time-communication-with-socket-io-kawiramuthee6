function extractUserId(req) {
  const userId = req.headers['x-user-id'] || req.headers['X-User-Id'];
  return userId;
}

async function requireAuth(req, res, next) {
  const userId = extractUserId(req);
  
  if (!userId) {
    return res.status(401).json({ message: "Missing user ID header (X-User-Id)" });
  }

  req.auth = {
    userId: userId,
    sessionId: null,
    claims: {}
  };

  return next();
}

module.exports = {
  requireAuth
};
