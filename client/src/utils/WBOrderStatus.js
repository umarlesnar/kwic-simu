class WBOrderStatus {
  messageId = "";
  type = "captured";
  wa_id = "";
  referenceId = "";
  amount = { value: 200, offset: 100 };
  currency = "INR";

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

    let statusPayload = {
      id: this.messageId,
      status: this.type === "captured" ? "captured" : "pending",
      timestamp: (Date.now() / 1000).toFixed(0).toString(),
      recipient_id: this.wa_id,
      type: "payment",
      payment: {
        reference_id: this.referenceId,
        amount: this.amount,
        currency: this.currency,
        transaction: {
          id: `order_${Date.now()}`,
          pg_transaction_id: `pay_${Date.now()}`,
          type: "razorpay",
          status: this.type === "captured" ? "success" : "failed",
          created_timestamp: Math.floor(Date.now() / 1000),
          updated_timestamp: Math.floor(Date.now() / 1000),
          amount: this.amount,
          currency: this.currency,
          method: {
            type: "upi",
          },
        },
        receipt: this.referenceId,
      },
    };

    if (this.type === "failed") {
      statusPayload.payment.transaction.error = {
        code: "BAD_REQUEST_ERROR",
        reason: "incorrect_pin",
      };
    }

    final_template.entry[0].changes[0].value.statuses[0] = statusPayload;
    return final_template;
  }
}

export default WBOrderStatus;
