// src/framework/api/businessService.js
import http from "../http";

export const businessService = {
  getAllBusinesses: async (page = 1, limit = 10) => {
    try {
      const response = await http.get(`/wb-accounts`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getSessionByWaId: async (phone_number, wa_id) => {
    try {
      const response = await http.get(`/${phone_number}/${wa_id}/session`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllTemplates: async (wba_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${wba_id}/templates`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllMessages: async (phone_number_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${phone_number_id}/messages`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllClients: async (phone_number_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${phone_number_id}/client`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllPhoneNumbers: async (wba_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${wba_id}/phone_numbers`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch businesses"
      );
    }
  },

  getAllProducts: async (catalog_id, page = 1, limit = 10) => {
    try {
      const response = await http.get(`/${catalog_id}/whatsapp_commerce_settings`, {
        params: { page, limit },
      });
      // Handle the response structure from your backend
      if (response.data && response.data.data) {
        return {
          data: response.data.data,
          paging: response.data.paging
        };
      }
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      console.error('Error response:', error.response);
      throw new Error(
        error.response?.data?.error || error.response?.data?.message || `Failed to fetch products: ${error.message}`
      );
    }
  },

  deleteBusiness: async (id) => {
    try {
      await http.delete(`/businesses/${id}`);
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to delete business"
      );
    }
  },

  updateBusinessStatus: async (id, status) => {
    try {
      const response = await http.patch(`/businesses/${id}`, {
        status,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to update status"
      );
    }
  },

  // Chat endpoints
  getChatMessages: async (phone_number_id, wa_id) => {
    try {
      const response = await http.get(`/${phone_number_id}/${wa_id}/messages`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch chat messages"
      );
    }
  },

  deleteChatMessage: async (phone_number_id, wa_id, message_id) => {
    try {
      const response = await http.delete(`/${phone_number_id}/${wa_id}/messages/${message_id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to delete chat message"
      );
    }
  },

  getChatInfo: async (phone_number_id, wa_id) => {
    try {
      const response = await http.get(`/${phone_number_id}/${wa_id}/info`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch chat info"
      );
    }
  },

  sendMessage: async (phone_number_id, wa_id, message, type = "text") => {
    try {
      const response = await http.post(
        `/${phone_number_id}/${wa_id}/send-message`,
        {
          message,
          type,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to send message"
      );
    }
  },

  // Delete client and all associated messages
  deleteClient: async (phone_number_id, wa_id) => {
    try {
      const response = await http.delete(`/${phone_number_id}/client/${wa_id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to delete client"
      );
    }
  },

  // Delete specific messages
  deleteMessages: async (phone_number_id, messageIds) => {
    try {
      const response = await http.delete(`/${phone_number_id}/messages`, {
        data: { messageIds }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to delete messages"
      );
    }
  },

  // Rename client
  renameClient: async (phone_number_id, wa_id, newName) => {
    try {
      const response = await http.patch(`/${phone_number_id}/client/${wa_id}`, {
        name: newName
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to rename client"
      );
    }
  },

  // Add new client
  addClient: async (phone_number_id, wa_id, clientName, wba_id) => {
    try {
      const response = await http.post(`/${phone_number_id}/client`, {
        wa_id,
        phone_number_id,
        wba_id,
        profile: {
          name: clientName || wa_id
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to add client"
      );
    }
  },

  // Get groups for a specific client
  getClientGroups: async (phone_number_id, wa_id) => {
    try {
      const response = await http.get(`/${phone_number_id}/participant/${wa_id}/groups`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch client groups"
      );
    }
  },

  // Upload media
  uploadMedia: async (formData) => {
    try {
      const response = await http.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to upload media"
      );
    }
  },

  // Join a group via invite link
  joinGroup: async (invite_link, wa_id) => {
    try {
      const response = await http.post("/groups/join", {
        invite_link,
        wa_id
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to join group"
      );
    }
  },

  // Get join requests for a group
  getGroupJoinRequests: async (groupId) => {
    try {
      const response = await http.get(`/${groupId}/join_requests`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch join requests"
      );
    }
  },

  // Approve join requests
  approveJoinRequests: async (groupId, waIds) => {
    try {
      const response = await http.post(`/${groupId}/join_requests`, {
        messaging_product: "whatsapp",
        join_requests: waIds
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to approve join requests"
      );
    }
  },

  // Reject join requests
  rejectJoinRequests: async (groupId, waIds) => {
    try {
      const response = await http.delete(`/${groupId}/join_requests`, {
        data: {
          messaging_product: "whatsapp",
          join_requests: waIds
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to reject join requests"
      );
    }
  },
};
