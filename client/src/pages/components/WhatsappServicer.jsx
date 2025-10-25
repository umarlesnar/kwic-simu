class WhatsappService {
  profileName = "";
  identity = null;
  constructor(
    wba_id,
    phone_number_id,
    display_phone_number,
    catalog_id,
    wa_id,
    status,
    errors_code,
    conversation_id
  ) {
    this.wba_id = wba_id;
    this.phone_number_id = phone_number_id;
    this.display_phone_number = display_phone_number;
    this.wa_id = wa_id;
    this.status = status;
    this.errors_code = errors_code;
    this.conversation_id = conversation_id;
    this.catalog_id = catalog_id;
  }

  generateRandomString(length = 28) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  }

  getCurrentDateTime() {
    return new Date().toLocaleString();
  }

  /*** ===== STATUS METHODS ===== ***/
  UserInitiatedStatus() {
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
                statuses: [
                  {
                    id: `mid.${this.generateRandomString()}`,
                    recipient_id: "PHONE_NUMBER",
                    status: this.status,
                    timestamp: Date.now(),
                    conversation: {
                      id: this.conversation_id,
                      expiration_timestamp: Date.now,
                      origin: { type: "user_initiated" },
                    },
                    pricing: {
                      pricing_model: "CBP",
                      billable: true,
                      category: "user_initiated",
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
  }

  UpdateNotification() {
    const value = {
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
                statuses: [
                  {
                    id: `wamid.${this.generateRandomString()}`,
                    status: this.status,
                    timestamp: Date.now(),
                    recipient_id: "16315551234",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    return value;
  }

  DeletedStatus() {
    const value = {
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
                contacts: [
                  {
                    profile: {
                      name: "NAME",
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: `wamid.${this.generateRandomString()}`,
                    timestamp: Date.now(),
                    errors: [
                      {
                        code: this.errors_code,
                        details: "Message type is not currently supported",
                        title: "Unsupported message type",
                      },
                    ],
                    type: "unsupported",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    return value;
  }

  OrderMassageStatus() {
    const value = {
      _id: {
        $oid: "67b9ab815adfb2a19e984dec",
      },
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
                statuses: [
                  {
                    id: `wamid.${this.generateRandomString()}`,
                    status: this.status,
                    timestamp: Date.now(),
                    recipient_id: "918667551348",
                    type: "payment",
                    payment: {
                      reference_id: "76",
                      amount: {
                        value: 995,
                        offset: 100,
                      },
                      currency: "INR",
                      transaction: {
                        id: "order_PyjEohB0D8uyFc",
                        type: "razorpay",
                        status: "success",
                        created_timestamp: 1740221310,
                        updated_timestamp: 1740221310,
                        amount: {
                          value: 995,
                          offset: 100,
                        },
                        currency: "INR",
                        method: {
                          type: "upi",
                        },
                      },
                      receipt: "76",
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
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
      created_at: {
        $date: `${this.getCurrentDateTime()}`,
      },
    };
    return value;
  }

  Failed() {
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
                statuses: [
                  {
                    id: `wamid.${this.generateRandomString()}`,
                    status: "failed",
                    timestamp: Date.now(),
                    recipient_id: this.phone_number_id,
                    errors: [
                      {
                        code: this.errors_code,
                        title:
                          "Request for URL failed with error: 404 (Not Found)",
                      },
                    ],
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
  }

  /*** ===== TEMPLATE METHODS ===== ***/
  TempletCategoryUpdate() {
    return {
      field: "template_category_update",
      value: {
        message_template_id: 12345678,
        message_template_name: "my_message_template",
        message_template_language: "en-US",
        previous_category: "MARKETING",
        new_category: "UTILITY",
        correct_category: "MARKETING",
      },
    };
  }

  WbAccountUpdate() {
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          time: Date.now(),
          changes: [
            {
              value: {
                message_template_id: 1264874708117494,
                message_template_name: "valentine__day__offer_",
                message_template_language: "en",
                message_template_element:
                  "Take 1500 worth service for you & \n get 750 worth service free for your loved one",
                message_template_buttons: [
                  {
                    message_template_button_type: "PHONE_NUMBER",
                    message_template_button_text: "Call Phone Number",
                    message_template_button_phone_number: "+919000005050",
                  },
                ],
              },
              field: "message_template_components_update",
            },
          ],
        },
      ],
    };
  }

  /*** ===== E-COMMERCE METHODS ===== ***/

  pushOrderRecivedMessage(productItems) {
    const values = {
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
                contacts: [
                  {
                    profile: {
                      name: "Kerry Fisher",
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: "wamid." + this.generateRandomString(),
                    order: {
                      catalog_id: this.catalog_id,
                      product_items: productItems,
                      text: "text-message-sent-along-with-the-order",
                    },
                    context: {
                      from: this.wa_id,
                      id: "wamid." + this.generateRandomString(),
                    },
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    type: "order",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    return values;
  }

  pushFlowStatusChangeEvent(flow_id, old_status, new_status) {
    const flowData = {
      entry: [
        {
          id: this.wba_id,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              value: {
                event: "FLOW_STATUS_CHANGE",
                message: `Flow onboarding changed status from ${old_status} to ${new_status}`,
                flow_id: flow_id,
                old_status: old_status,
                new_status: new_status,
              },
              field: "flows",
            },
          ],
        },
      ],
      object: "whatsapp_business_account",
    };
    return flowData;
  }

  pushOrderAddressMessage(response_json, body) {
    const orderAddressData = {
      _id: {
        $oid: this.generateRandomString(24),
      },
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
                contacts: [
                  {
                    profile: {
                      name: this.profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    context: {
                      from: this.display_phone_number,
                      id: "wamid." + this.generateRandomString(),
                    },
                    from: this.wa_id,
                    id: "wamid." + this.generateRandomString(),
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    type: "interactive",
                    interactive: {
                      type: "nfm_reply",
                      nfm_reply: {
                        response_json: response_json,
                        body: body,
                        name: "address_message",
                      },
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
      created_at: {
        $date: new Date().toISOString(),
      },
    };

    return orderAddressData;
  }

  //* ===== MESSAGE METHODS ===== ***/
  pushTextMessage(textBody) {
    const message = {
      from: this.wa_id,
      id: "wamid." + this.generateRandomString(),
      timestamp: (Date.now() / 1000).toFixed(0).toString(),
      text: {
        body: textBody,
      },
      type: "text",
    };

    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: this.profileName,
          },
          wa_id: this.wa_id,
        },
      ],
      messages: [message],
    };
    return this.generateFinalResponse(values);
  }
  pushSecurityNotificationMessage(
    contactName,
    waId,
    fromPhoneNumber,
    textBody,
    identityHash,
    identityTimestamp
  ) {
    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: contactName,
          },
          wa_id: waId,
        },
      ],
      messages: [
        {
          from: fromPhoneNumber,
          id: "wamid." + this.generateRandomString(),
          timestamp: (Date.now() / 1000).toFixed(0).toString(),
          type: "text",
          text: {
            body: textBody,
          },
          identity: {
            acknowledged: true,
            created_timestamp: identityTimestamp,
            hash: identityHash,
          },
        },
      ],
    };
    return this.generateFinalResponse(values);
  }
  pushImageMessage(imageId, caption) {
    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: this.profileName,
          },
          wa_id: this.wa_id,
        },
      ],
      messages: [
        {
          from: this.wa_id,
          id: "wamid." + this.generateRandomString(),
          timestamp: (Date.now() / 1000).toFixed(0).toString(),
          type: "image",
          image: {
            caption: caption,
            mime_type: "image/jpeg",
            id: imageId,
          },
        },
      ],
    };
    return this.generateFinalResponse(values);
  }
  pushStickerMessage(stickerId, animated, mimeType, hash) {
    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: this.profileName,
          },
          wa_id: this.wa_id,
        },
      ],
      messages: [
        {
          from: this.wa_id,
          id: "wamid." + this.generateRandomString(),
          timestamp: (Date.now() / 1000).toFixed(0).toString(),
          type: "sticker",
          sticker: {
            id: stickerId,
            animated: animated,
            mime_type: mimeType,
            sha256: hash,
          },
        },
      ],
    };
    return this.generateFinalResponse(values);
  }
  pushContactMessage(contactData) {
    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: this.profileName,
          },
          wa_id: this.wa_id,
        },
      ],
      messages: [
        {
          from: this.wa_id,
          id: "wamid." + this.generateRandomString(),
          timestamp: (Date.now() / 1000).toFixed(0).toString(),
          contacts: [contactData],
          type: "contacts",
        },
      ],
    };
    return this.generateFinalResponse(values);
  }
  pushLocationMessage(latitude, longitude, name, address) {
    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: this.profileName,
          },
          wa_id: this.wa_id,
        },
      ],
      messages: [
        {
          from: this.wa_id,
          id: "wamid." + this.generateRandomString(),
          timestamp: (Date.now() / 1000).toFixed(0).toString(),
          type: "location",
          location: {
            latitude: latitude,
            longitude: longitude,
            name: name,
            address: address,
          },
        },
      ],
    };
    return this.generateFinalResponse(values);
  }
  pushReferralMessage(
    sourceUrl,
    sourceId,
    sourceType,
    headline,
    body,
    mediaType,
    imageUrl,
    videoUrl,
    thumbnailUrl
  ) {
    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: this.profileName,
          },
          wa_id: this.wa_id,
        },
      ],
      messages: [
        {
          from: this.wa_id,
          id: "wamid." + this.generateRandomString(),
          timestamp: (Date.now() / 1000).toFixed(0).toString(),
          type: "text",
          text: {
            body: body,
          },
          referral: {
            source_url: sourceUrl,
            source_id: sourceId,
            source_type: sourceType,
            headline: headline,
            body: body,
            media_type: mediaType,
            image_url: imageUrl,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
          },
        },
      ],
    };
    return this.generateFinalResponse(values);
  }
  pushUnknownMessage(errorCode, errorTitle, errorDetails) {
    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: this.profileName,
          },
          wa_id: this.wa_id,
        },
      ],
      messages: [
        {
          from: this.wa_id,
          id: "wamid." + this.generateRandomString(),
          timestamp: (Date.now() / 1000).toFixed(0).toString(),
          type: "unknown",
          errors: [
            {
              code: errorCode,
              title: errorTitle,
              details: errorDetails,
            },
          ],
        },
      ],
    };
    return this.generateFinalResponse(values);
  }
  pushButtonMessage(buttonText, payload, contextFrom, contextId) {
    const values = {
      messaging_product: "whatsapp",
      metadata: {
        display_phone_number: this.display_phone_number,
        phone_number_id: this.phone_number_id,
      },
      contacts: [
        {
          profile: {
            name: this.profileName,
          },
          wa_id: this.wa_id,
        },
      ],
      messages: [
        {
          context: {
            from: contextFrom,
            id: contextId,
          },
          from: this.wa_id,
          id: "wamid." + this.generateRandomString(),
          timestamp: (Date.now() / 1000).toFixed(0).toString(),
          type: "button",
          button: {
            text: buttonText,
            payload: payload,
          },
        },
      ],
    };
    return this.generateFinalResponse(values);
  }

  generateFinalResponse(values) {
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          id: this.wba_id,
          changes: [
            {
              value: values,
              field: "messages",
            },
          ],
        },
      ],
    };
  }
}
export default WhatsappService;
