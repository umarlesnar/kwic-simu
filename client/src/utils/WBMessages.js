class WBMessages {
  profile = null;
  wa_id = null;
  constructor(wba_id, phone_number_id) {
    this.wba_id = wba_id;
    this.phone_number_id = phone_number_id;
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

  getTextMessage(textBody, profileName = "Riaz") {
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
                contacts: [
                  {
                    profile: {
                      name: profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: `wamid.${this.generateRandomString()}`,
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    text: {
                      body: textBody,
                    },
                    type: "text",
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
  getOrderMessage(selectedProducts, profileName = "Riaz") {
    const productItems = selectedProducts.map((product) => {
      const priceStr = (product.price || "0")
        .toString()
        .replace(/[^0-9.]/g, "");
      return {
        product_retailer_id: product.retailer_id || product.id,
        quantity: 1,
        item_price: parseFloat(priceStr) || 0,
        currency: product.currency || "INR",
      };
    });

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
                contacts: [
                  {
                    profile: {
                      name: profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: `wamid.${this.generateRandomString()}`,
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    type: "order",
                    order: {
                      catalog_id:
                        selectedProducts[0]?.catalog_id || "17000000001",
                      text: `Cart with ${selectedProducts.length} items`,
                      product_items: productItems,
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

  getContactMessage(contactData, profileName = "Riaz") {
    const contact = {
      name: {
        formatted_name: contactData.formattedName,
        first_name: contactData.firstName,
        last_name: contactData.lastName,
      },
    };

    if (contactData.phone) {
      contact.phones = [
        {
          phone: contactData.phone,
          type: contactData.phoneType || "WORK",
        },
      ];
    }

    if (contactData.email) {
      contact.emails = [
        {
          email: contactData.email,
          type: contactData.emailType || "WORK",
        },
      ];
    }

    if (contactData.address) {
      contact.addresses = [
        {
          street: contactData.street,
          city: contactData.city,
          state: contactData.state,
          zip: contactData.zip,
          country: contactData.country,
          country_code: contactData.countryCode,
          type: contactData.addressType || "WORK",
        },
      ];
    }

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
                contacts: [
                  {
                    profile: {
                      name: profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: `wamid.${this.generateRandomString()}`,
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    type: "contacts",
                    contacts: [contact],
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

  getInteractiveReplyMessage(interactivePayload, profileName = "Riaz") {
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
                contacts: [
                  {
                    profile: {
                      name: profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: `wamid.${this.generateRandomString()}`,
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    type: "interactive",
                    interactive: interactivePayload.interactive,
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
  getErrorMessage() {
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
                errors: [
                  {
                    code: 130429,
                    title: "Rate limit hit",
                    message:
                      "Message failed to send because there were too many messages sent from this phone number in a short period of time",
                    error_data: {
                      details:
                        "Messaging limit is 1000 conversations per day. Retry after 24 hours.",
                    },
                    href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes#130429",
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
  getLocationMessage(locationData, profileName = "Riaz") {
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
                contacts: [
                  {
                    profile: {
                      name: profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: `wamid.${this.generateRandomString()}`,
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    type: "location",
                    location: {
                      latitude: parseFloat(locationData.latitude),
                      longitude: parseFloat(locationData.longitude),
                      name: locationData.name || "San Francisco Office",
                      address:
                        locationData.address ||
                        "123 Market St, San Francisco, CA 94103",
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

  getFlowMessage(flowData, profileName = "Riaz") {
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
                contacts: [
                  {
                    profile: {
                      name: profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: `wamid.${this.generateRandomString()}`,
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    type: "interactive",
                    interactive: {
                      type: "nfm_reply",
                      nfm_reply: {
                        response_json: flowData.responseJson,
                        body: flowData.body || "Sent",
                        name: flowData.name || "flow",
                        flow_id: flowData.flowId || "1800000000002",
                      },
                    },
                    context: {
                      from: this.display_phone_number,
                      id: `wamid.${this.generateRandomString()}`,
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
  getMediaMessage(mediaType, mediaData, profileName = "Riaz") {
    const messagePayload = {
      from: this.wa_id,
      id: `wamid.${this.generateRandomString()}`,
      timestamp: (Date.now() / 1000).toFixed(0).toString(),
      type: mediaType,
    };

    messagePayload[mediaType] = {
      mime_type: mediaData.mime_type,
      sha256: mediaData.sha256 || this.generateRandomString(64),
      id: mediaData.id,
      link: mediaData.url,
    };

    if (mediaData.caption) {
      messagePayload[mediaType].caption = mediaData.caption;
    }

    if (mediaType === "document" && mediaData.filename) {
      messagePayload[mediaType].filename = mediaData.filename;
    }

    if (mediaType === "audio" && mediaData.voice !== undefined) {
      messagePayload[mediaType].voice = mediaData.voice;
    }

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
                contacts: [
                  {
                    profile: {
                      name: profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [messagePayload],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
  }

  getAdReferralMessage(adData, profileName = "Riaz") {
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
                contacts: [
                  {
                    profile: {
                      name: profileName,
                    },
                    wa_id: this.wa_id,
                  },
                ],
                messages: [
                  {
                    from: this.wa_id,
                    id: `wamid.${this.generateRandomString()}`,
                    timestamp: (Date.now() / 1000).toFixed(0).toString(),
                    type: "text",
                    text: {
                      body: adData.messageText || "Hi, I saw your ad!",
                    },
                    referral: {
                      source_url: adData.sourceUrl || "https://example.com/ad",
                      source_type: "ad",
                      source_id: adData.sourceId || "AD_ID",
                      headline:
                        adData.headline || "Summer Sale 2024 - Up to 50% Off!",
                      body:
                        adData.body || "Click to message us and learn more.",
                      media_type: adData.mediaType || "image",
                      image_url:
                        adData.imageUrl || "https://example.com/image.jpg",
                      video_url: adData.videoUrl || null,
                      thumbnail_url:
                        adData.thumbnailUrl || "https://example.com/thumb.jpg",
                      welcome_message: {
                        text: adData.greetingText || "Welcome to our store!",
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
    };
  }

  getStopMarketingMessage(profileName = "Riaz") {
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
                contacts: [
                  {
                    wa_id: this.wa_id,
                  },
                ],
                user_preferences: [
                  {
                    wa_id: this.wa_id,
                    detail: "User requested to stop marketing messages",
                    category: "marketing_messages",
                    value: "stop",
                    timestamp: Math.floor(Date.now() / 1000),
                  },
                ],
              },
              field: "user_preferences",
            },
          ],
        },
      ],
    };
  }
}

export default WBMessages;
