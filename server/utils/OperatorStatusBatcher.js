import axios from "axios";
import LogManager from "./LogManager.js";

export class OperatorStatusBatcher {
  constructor(webhookUrl) {
    this.pendingUpdates = new Map();
    this.batchInterval = null;
    this.BATCH_DELAY = 5000;
    this.webhookUrl = webhookUrl;
    this.logManager = new LogManager();
  }

  addStatusUpdate(session_id, is_online) {
    try {
      if (!session_id) return;

      const now = new Date().toISOString();
      this.pendingUpdates.set(session_id, {
        client_auth_id: session_id,
        is_online,
        timestamp: now,
        updated_at: now,
      });

      this.scheduleBatch();
    } catch (error) {
      // Silent fail - don't block socket operations
    }
  }

  scheduleBatch() {
    if (this.batchInterval) return;

    this.batchInterval = setTimeout(() => {
      this.processBatch().catch(() => {});
    }, this.BATCH_DELAY);
  }

  async processBatch() {
    try {
      if (this.pendingUpdates.size === 0) {
        this.batchInterval = null;
        return;
      }

      const updates = Array.from(this.pendingUpdates.values());
      this.pendingUpdates.clear();
      this.batchInterval = null;

      await axios.post(
        this.webhookUrl,
        {
          event_type: "batch_status_update",
          batch_size: updates.length,
          processed_at: new Date().toISOString(),
          updates,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );
    } catch (error) {
      this.logManager.error("Batch API failed - continuing execution");
    }
  }
}
