function extractSocketUserId(handshake) {
  if (handshake.auth && handshake.auth.userId) {
    return handshake.auth.userId;
  }

  const userId = handshake.headers?.['x-user-id'] || handshake.headers?.['X-User-Id'];
  return userId;
}

function socketAuthMiddleware(socket, next) {
  try {
    const userId = extractSocketUserId(socket.handshake);
    
    if (!userId) {
      const err = new Error("Unauthorized");
      err.data = { code: "UNAUTHORIZED", message: "User ID missing" };
      return next(err);
    }

    socket.data = {
      ...socket.data,
      userId: userId,
      sessionId: null,
      claims: {}
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  socketAuthMiddleware
};
