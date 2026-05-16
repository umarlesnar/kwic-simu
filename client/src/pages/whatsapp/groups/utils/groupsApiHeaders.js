/**
 * When set, the groups API skips server-side webhook emit; the UI calls POST /webhook/push instead.
 */
export const GROUPS_WEBHOOK_CLIENT_HEADERS = {
  "X-Simulator-Webhook-Source": "client",
};

export function groupsWebhookAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    ...GROUPS_WEBHOOK_CLIENT_HEADERS,
  };
}
