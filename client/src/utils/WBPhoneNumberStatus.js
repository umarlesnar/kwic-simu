class WBPhoneNumberStatus {
  type = "APPROVED";
  reason = "NONE";

  display_phone_number = "";
  ververified_name = "";

  phone_number_id = "";

  constructor(wba_id) {
    this.wba_id = wba_id;
  }

  getDisplayPhoneNumber() {
    return this.display_phone_number.replace(/[ +]/g, "");
  }

  getGreenTickAlertObject() {
    const final_tempate = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          time: Number((Date.now() / 1000).toFixed(0)),
          changes: [
            {
              value: {
                entity_type: "PHONE_NUMBER",
                entity_id: this.phone_number_id,
                alert_severity: "INFORMATIONAL",
                alert_status: "NONE",
                alert_type: "OBA_APPROVED",
                alert_description:
                  "This phone number now has a green badge next to its name showing that it's an authentic and notable business account. Add more details to your business profile to increase customer trust.",
              },
              field: "account_alerts",
            },
          ],
        },
      ],
    };

    return final_tempate;
  }

  getQualityUpdateObject() {
    const final_tempate = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          time: Number((Date.now() / 1000).toFixed(0)),
          changes: [
            {
              value: {
                display_phone_number: this.getDisplayPhoneNumber(),
                event: this.type,
                current_limit: "TIER_10K",
                old_limit: "TIER_1K",
              },
              field: "phone_number_quality_update",
            },
          ],
        },
      ],
    };

    if (this.type === "TIER_1K") {
      final_tempate.entry[0].changes[0].value.event = "UPGRADE";
      final_tempate.entry[0].changes[0].value.current_limit = "TIER_1K";
    } else if (this.type === "ONBOARDING") {
      final_tempate.entry[0].changes[0].value.event = "ONBOARDING";
      final_tempate.entry[0].changes[0].value.current_limit = "TIER_1K";
    } else if (this.type === "TIER_100K") {
      final_tempate.entry[0].changes[0].value.event = "UPGRADE";
      final_tempate.entry[0].changes[0].value.current_limit = "TIER_100K";
    }

    return final_tempate;
  }

  getNameStatusObject() {
    const final_tempate = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          time: Number((Date.now() / 1000).toFixed(0)),
          changes: [
            {
              value: {
                display_phone_number: this.getDisplayPhoneNumber(),
                decision: this.type,
                requested_verified_name: this.ververified_name,
              },
              field: "phone_number_name_update",
            },
          ],
        },
      ],
    };

    if (this.type === "REJECTED") {
      final_tempate.entry[0].changes[0].value.decision = "REJECTED";
      final_tempate.entry[0].changes[0].value.rejection_reason =
        "BIZ_COMMERCE_VIOLATION_OTHER";
    } else if (this.type === "DEFERRED") {
      final_tempate.entry[0].changes[0].value.decision = "REJECTED";
      final_tempate.entry[0].changes[0].value.rejection_reason = "NONE";
    } else if (this.type === "RED") {
      final_tempate.entry[0].changes[0].value.new_quality_score = "RED";
    } else if (this.type === "UNKNOWN") {
      final_tempate.entry[0].changes[0].value.new_quality_score = "UNKNOWN";
    }

    return final_tempate;
  }
}

export default WBPhoneNumberStatus;
