import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const createAuthenticatedClient = (userId) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId
    }
  });

  return instance;
};

export function createApiClient(userId) {
  const client = createAuthenticatedClient(userId);

  return {
    users: {
      async list() {
        const res = await client.get("/api/users");
        return res.data;
      },
      async syncProfile(payload) {
        const res = await client.post("/api/users/sync", payload);
        return res.data;
      }
    },
    conversations: {
      async list() {
        const res = await client.get("/api/conversations");
        return res.data;
      },
      async ensureConversation(targetUserId) {
        const res = await client.post("/api/conversations", { targetUserId });
        return res.data;
      },
      async getDetail(conversationId) {
        const res = await client.get(`/api/conversations/${conversationId}`);
        return res.data;
      }
    },
    messages: {
      async list(conversationId) {
        const res = await client.get(`/api/messages/${conversationId}`);
        return res.data;
      },
      async send(conversationId, text) {
        const res = await client.post("/api/messages", {
          conversationId,
          text
        });
        return res.data;
      }
    }
  };
}
