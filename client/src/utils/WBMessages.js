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
    const productItems = selectedProducts.map(product => {
      const priceStr = (product.price || '0').toString().replace(/[^0-9.]/g, '');
      return {
        product_retailer_id: product.retailer_id || product.id,
        quantity: 1,
        item_price: parseFloat(priceStr) || 0,
        currency: product.currency || "INR"
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
                      catalog_id: selectedProducts[0]?.catalog_id || "17000000001",
                      text: `Cart with ${selectedProducts.length} items`,
                      product_items: productItems
                    }
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
                    interactive: interactivePayload.interactive
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
}

export default WBMessages;
