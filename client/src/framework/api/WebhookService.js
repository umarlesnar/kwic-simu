// src/framework/api/businessService.js
import http from "../http";

export const WebhookService = {
  push: async (payload) => {
    try {
      const response = await http.post(`/webhook/push`, payload);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to update status"
      );
    }
  },
};
