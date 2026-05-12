module.exports = class IdGenerator {
  constructor() {
    // Private constructor to prevent instantiation
  }

  static generateId() {
    const timestamp = Date.now().toString(36); // Convert timestamp to base 36 string
    const random = Math.random().toString(36).substr(2, 5); // Generate a random 5-character base 36 string
    return `${timestamp}${random}`; // Combine timestamp and random string
  }
  static generateRandomNumber() {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit random number
  }

  static generatePhoneNumberId() {
    return `12${this.generateRandomNumber()}`;
  }

  static generateWhatsappBusinessAccountId() {
    return `11${this.generateRandomNumber()}`;
  }

  static generateTemplateId() {
    return `13${this.generateRandomNumber()}`;
  }

  static generateAppId() {
    return `14${this.generateRandomNumber()}`;
  }

  static generateFileUploadId() {
    return `upload_${this.generateRandomNumber()}`;
  }

  static generateMediaId() {
    return `15${this.generateRandomNumber()}`;
  }

  static generateFbBusinessId() {
    return `16${this.generateRandomNumber()}`;
  }

  static generateCatalogId() {
    return `17${this.generateRandomNumber()}`;
  }

  static generateGenericId() {
    return `generic_${this.generateRandomNumber()}`;
  }

  static generateId(type) {
    switch (type) {
      case "phone_number_id":
        return this.generatePhoneNumberId();
      case "whatsapp_business_account_id":
        return this.generateWhatsappBusinessAccountId();
      case "template_id":
        return this.generateTemplateId();
      case "app_id":
        return this.generateAppId();
      case "file_upload_id":
        return this.generateFileUploadId();
      case "media_id":
        return this.generateMediaId();
      case "FB_BUSINESS_ID":
        return this.generateFbBusinessId();
      case "catalog_id":
        return this.generateCatalogId();
      default:
        return this.generateGenericId();
    }
  }
};
