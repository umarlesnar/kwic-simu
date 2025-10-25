class WBMessageStatus {
  messageId = "";
  type = "sent";
  wa_id = "";
  conversation = null;
  error_code = null;

  static ERROR_CODES = {
    131047: "131047",
    131049: "131049",
    131026: "131026",
    130472: "130472",
  };

  constructor(display_phone_number, phone_number_id, wba_id) {
    this.display_phone_number = display_phone_number;
    this.phone_number_id = phone_number_id;
    this.wba_id = wba_id;
  }

  getObject() {
    const final_template = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "16315551234",
                  phone_number_id: "16315551234",
                },
                statuses: [],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    final_template.entry[0].changes[0].value.metadata = {
      display_phone_number: this.display_phone_number,
      phone_number_id: this.phone_number_id,
    };

    let statusPayload = {};
    if (this.type === "sent") {
      statusPayload = {
        id: this.messageId,
        status: "sent",
        timestamp: (Date.now() / 1000).toFixed(0).toString(),
        recipient_id: this.wa_id,
        conversation: {
          id: this.conversation.id,
          origin: this.conversation.origin,
          pricing: this.conversation.pricing,
          expiration_timestamp: this.conversation.expiration_timestamp
            .toFixed(0)
            .toString(),
        },
      };
    } else if (this.type === "read") {
      statusPayload = {
        id: this.messageId,
        status: "read",
        timestamp: (Date.now() / 1000).toFixed(0).toString(),
        recipient_id: this.wa_id,
      };
    } else if (this.type === "delivered") {
      statusPayload = {
        id: this.messageId,
        status: "delivered",
        timestamp: (Date.now() / 1000).toFixed(0).toString(),
        recipient_id: this.wa_id,
        conversation: {
          id: this.conversation.id, //  Take from session
          origin: this.conversation.origin,
          pricing: this.conversation.pricing,
        },
      };
    } else if (this.type === "unsupported") {
      statusPayload = {
        id: this.messageId,
        status: "unknown",
        timestamp: (Date.now() / 1000).toFixed(0).toString(),
        recipient_id: this.wa_id,
      };
    } else if (this.type === "failed") {
      let error_obj = {
        code: 131014,
        message: "Message undeliverable",

        title: "Message undeliverable",
        error_data: {
          details: "Message Undeliverable.",
        },
      };

      if (this.error_code == "131047") {
        error_obj = {
          code: 131047,
          message: "Re-engagement message",

          title: "Re-engagement message",
          error_data: {
            details:
              "Message failed to send because more than 24 hours have passed since the customer last replied to this number.",
          },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        };
      } else if (this.error_code == "130472") {
        error_obj = {
          code: 130472,
          message: "User's number is part of an experiment",

          title: "User's number is part of an experiment",
          error_data: {
            details:
              "Failed to send message because this user's phone number is part of an experiment",
          },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        };
      } else if (this.error_code == "131026") {
        error_obj = {
          code: 131026,
          message: "Message undeliverable",

          title: "Message undeliverable",
          error_data: {
            details: "Message Undeliverable.",
          },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        };
      } else if (this.error_code == "131049") {
        error_obj = {
          code: 131049,
          message:
            "This message was not delivered to maintain healthy ecosystem engagement.",

          title:
            "This message was not delivered to maintain healthy ecosystem engagement.",
          error_data: {
            details:
              "In order to maintain a healthy ecosystem engagement, the message failed to be delivered.",
          },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        };
      }

      statusPayload = {
        id: this.messageId,
        status: "failed",
        timestamp: (Date.now() / 1000).toFixed(0).toString(),
        recipient_id: this.wa_id,
        errors: [error_obj],
      };
    } else if (this.type === "pending") {
      statusPayload = {
        id: this.messageId,
        status: "pending",
        type: "payment",
        timestamp: (Date.now() / 1000).toFixed(0).toString(),
        recipient_id: this.wa_id,
        payment: {
          reference_id: "77",
          amount: {
            value: 995,
            offset: 100,
          },
          currency: "INR",
          transaction: {
            id: "order_Q1SAe8GScFaF7z",
            type: "razorpay",
            status: "failed",
            created_timestamp: 1740816223,
            updated_timestamp: 1740816223,
            amount: {
              value: 995,
              offset: 100,
            },
            currency: "INR",
            error: {
              code: "GATEWAY_ERROR",
              reason: "insufficient_funds",
            },
          },
          receipt: "77",
          shipping_info: {
            country: "IN",
            shipping_address: {
              address: "2/53",
              city: "Salem",
              in_pin_code: "636203",
              landmark_area: "periya kattur",
              name: "Subramani",
              phone_number: "918667551348",
              state: "Tamilnadu",
            },
          },
        },
      };
    }

    final_template.entry[0].changes[0].value.statuses[0] = statusPayload;

    return final_template;
  }
}

export default WBMessageStatus;
