class WBTemplateStatus {
  messageId = "";
  type = "APPROVED";
  wa_id = "";
  message_template_id = "";
  message_template_name = "";
  message_template_language = "";
  reason = "NONE";

  constructor(wba_id) {
    this.wba_id = wba_id;
  }

  getStatusObject() {
    const final_tempate = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          time: Number((Date.now() / 1000).toFixed(0)),
          changes: [
            {
              value: {
                previous_quality_score: "YELLOW",
                new_quality_score: "UNKNOWN",
                message_template_id: Number(this.message_template_id),
                message_template_name: this.message_template_name,
                message_template_language: this.message_template_language,
              },
              field: "message_template_status_update",
            },
          ],
        },
      ],
    };

    if (this.type === "YELLOW") {
      final_tempate.entry[0].changes[0].value.new_quality_score = "YELLOW";
    } else if (this.type === "GREEN") {
      final_tempate.entry[0].changes[0].value.new_quality_score = "GREEN";
    } else if (this.type === "RED") {
      final_tempate.entry[0].changes[0].value.new_quality_score = "RED";
    } else if (this.type === "UNKNOWN") {
      final_tempate.entry[0].changes[0].value.new_quality_score = "UNKNOWN";
    }

    return final_tempate;
  }

  getObject() {
    const final_tempate = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          time: Number((Date.now() / 1000).toFixed(0)),
          changes: [
            {
              value: {
                event: "APPROVED",
                message_template_id: Number(this.message_template_id),
                message_template_name: this.message_template_name,
                message_template_language: this.message_template_language,
                reason: this.reason,
              },
              field: "message_template_status_update",
            },
          ],
        },
      ],
    };

    if (this.type === "APPROVED") {
      final_tempate.entry[0].changes[0].value.event = "APPROVED";
    } else if (this.type === "REJECTED") {
      final_tempate.entry[0].changes[0].value.event = "REJECTED";
      final_tempate.entry[0].changes[0].value.reason = "SCAM";
    } else if (this.type === "PAUSED") {
      final_tempate.entry[0].changes[0].value.event = "PAUSED";
      final_tempate.entry[0].changes[0].value.other_info = {
        title: "SECOND_PAUSE",
        description:
          "Your WhatsApp message template has been paused for 6 hours until Mar 8 at 9:35 PM UTC because it continued to have issues. Template quality history, for example, low quality resulting in a template pause is one of the primary reasons for template pacing and you may see other marketing templates get paced.",
      };
    } else if (this.type === "PENDING_DELETION") {
      final_tempate.entry[0].changes[0].value.event = "PENDING_DELETION";
    } else if (this.type === "DISABLED") {
      final_tempate.entry[0].changes[0].value.event = "DISABLED";
      final_tempate.entry[0].changes[0].value.other_info = {
        title: "DISABLED",
        description:
          "Your WhatsApp message template has been disabled on Mar 15 at 5:08 PM UTC, and is no longer available to use, because it continued to have issues. For example, your customers were blocking or reporting your phone number after receiving the message or your message had a low read rate. Template quality history, for example, low quality resulting in a template pause is one of the primary reasons for template pacing and you may see other marketing templates get paced.",
      };
    }

    return final_tempate;
  }

  getTemplateCategoryChange(newCategory = "MARKETING") {
    return {
      entry: [
        {
          id: this.wba_id,
          time: Number((Date.now() / 1000).toFixed(0)),
          changes: [
            {
              value: {
                message_template_id: Number(this.message_template_id),
                message_template_name: this.message_template_name,
                message_template_language: this.message_template_language,
                new_category: newCategory,
              },
              field: "template_category_update",
            },
          ],
        },
      ],
      object: "whatsapp_business_account",
    };
  }
}

export default WBTemplateStatus;
