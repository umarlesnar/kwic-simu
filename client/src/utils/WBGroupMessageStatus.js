/**
 * Builds WhatsApp Cloud API style message *status* webhooks for outbound/inbound
 * group threads (recipient_type "group", recipient_id = group id).
 */
class WBGroupMessageStatus {
  messageId = "";
  type = "sent";
  /** @type {object|null} */
  conversation = null;
  error_code = null;
  /** Optional participant for delivered/read (participant_recipient_id in docs) */
  participant_wa_id = null;

  static ERROR_CODES = {
    131026: "131026",
    131047: "131047",
    131049: "131049",
    130472: "130472",
  };

  constructor(display_phone_number, phone_number_id, wba_id, group_id) {
    this.display_phone_number = display_phone_number;
    this.phone_number_id = phone_number_id;
    this.wba_id = wba_id;
    this.group_id = group_id;
  }

  buildConversationSlice() {
    const c = this.conversation;
    if (!c || !c.id) return undefined;
    return {
      id: c.id,
      origin: c.origin,
      pricing: c.pricing,
      expiration_timestamp: c.expiration_timestamp
        ? String(c.expiration_timestamp)
        : undefined,
    };
  }

  defaultGroupConversation() {
    return {
      id: `group_conv_${this.group_id?.slice(0, 8) || "sim"}`,
      origin: { type: "group_utility" },
      pricing: {
        billable: true,
        pricing_model: "PMP",
        category: "group_utility",
      },
    };
  }

  getObject() {
    const entry = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: this.display_phone_number,
                  phone_number_id: this.phone_number_id,
                },
                statuses: [],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const ts = (Date.now() / 1000).toFixed(0).toString();
    const baseStatus = {
      id: this.messageId,
      recipient_id: this.group_id,
      recipient_type: "group",
      timestamp: ts,
    };

    if (this.participant_wa_id && (this.type === "delivered" || this.type === "read")) {
      baseStatus.participant_recipient_id = this.participant_wa_id;
    }

    let statusPayload = { ...baseStatus };

    if (this.type === "sent") {
      const conv = this.buildConversationSlice();
      statusPayload = {
        ...baseStatus,
        status: "sent",
        ...(conv ? { conversation: conv } : {}),
      };
    } else if (this.type === "delivered") {
      const conv = this.buildConversationSlice() || this.defaultGroupConversation();
      statusPayload = { ...baseStatus, status: "delivered", conversation: conv };
    } else if (this.type === "read") {
      const conv = this.buildConversationSlice();
      statusPayload = {
        ...baseStatus,
        status: "read",
        ...(conv ? { conversation: conv } : {}),
      };
    } else if (this.type === "failed") {
      statusPayload = {
        ...baseStatus,
        status: "failed",
        errors: [this.buildErrorObject()],
      };
    }

    entry.entry[0].changes[0].value.statuses[0] = statusPayload;
    return entry;
  }

  buildErrorObject() {
    const code = String(this.error_code || "131026");
    const templates = {
      "131047": {
        code: 131047,
        title: "Re-engagement message",
        message: "Re-engagement message",
        error_data: {
          details:
            "Message failed to send because more than 24 hours have passed since the customer last replied to this number.",
        },
        href: "/documentation/business-messaging/whatsapp/support/error-codes",
      },
      "130472": {
        code: 130472,
        title: "User's number is part of an experiment",
        message: "User's number is part of an experiment",
        error_data: {
          details:
            "Failed to send message because this user's phone number is part of an experiment",
        },
        href: "/documentation/business-messaging/whatsapp/support/error-codes",
      },
      "131026": {
        code: 131026,
        title: "Message undeliverable",
        message: "Message undeliverable",
        error_data: { details: "Message Undeliverable." },
        href: "/documentation/business-messaging/whatsapp/support/error-codes",
      },
      "131049": {
        code: 131049,
        title: "Ecosystem engagement",
        message:
          "This message was not delivered to maintain healthy ecosystem engagement.",
        error_data: {
          details:
            "In order to maintain a healthy ecosystem engagement, the message failed to be delivered.",
        },
        href: "/documentation/business-messaging/whatsapp/support/error-codes",
      },
    };
    return (
      templates[code] || {
        code: 131026,
        title: "Message undeliverable",
        message: "Message undeliverable",
        error_data: { details: "Simulated group message failure." },
        href: "/documentation/business-messaging/whatsapp/support/error-codes",
      }
    );
  }

  /**
   * Aggregated webhook: multiple participants, same message id, same status (e.g. read).
   * @param {string[]} participantWaIds
   */
  getAggregatedForParticipants(participantWaIds, statusType = "read") {
    const ts = (Date.now() / 1000).toFixed(0).toString();
    const conv = this.buildConversationSlice() || this.defaultGroupConversation();
    const statuses = (participantWaIds || []).map((pid) => ({
      id: this.messageId,
      status: statusType,
      timestamp: ts,
      recipient_id: this.group_id,
      recipient_type: "group",
      recipient_participant_id: pid,
      conversation: conv,
    }));
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: this.display_phone_number,
                  phone_number_id: this.phone_number_id,
                },
                statuses,
              },
              field: "messages",
            },
          ],
        },
      ],
    };
  }
}

export default WBGroupMessageStatus;
