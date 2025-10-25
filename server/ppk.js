const crypto = require("crypto");

class EncryptedPPKSystem {
  constructor(secretKey = "your-encryption-key-must-be-32-chars!") {
    // Ensure secret key is 32 bytes for AES-256
    this.secretKey = crypto.createHash("sha256").update(secretKey).digest();
    this.algorithm = "aes-256-gcm";
    this.ivLength = 12; // Recommended IV length for GCM
    this.tagLength = 16; // Auth tag length for GCM
  }

  // Generate PPK with encrypted information
  generatePPK(info = {}) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(12).toString("hex");

    const payload = {
      timestamp,
      nonce,
      ...info,
    };

    const payloadString = JSON.stringify(payload);

    // Encrypt the payload
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

    let encrypted = cipher.update(payloadString, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // PPK = iv + encrypted + authTag (all hex)
    const ppk = iv.toString("hex") + encrypted + authTag.toString("hex");

    return {
      ppk: ppk.substring(0, 64), // Truncate for standard length if needed
      fullPPK: ppk,
      payload,
      encrypted,
    };
  }

  // Verify and decrypt PPK
  verifyPPK(ppk) {
    try {
      // For full PPK, try to decrypt
      if (ppk.length > (this.ivLength + this.tagLength) * 2) {
        const ivHex = ppk.substring(0, this.ivLength * 2);
        const authTagHex = ppk.substring(ppk.length - this.tagLength * 2);
        const encryptedHex = ppk.substring(
          this.ivLength * 2,
          ppk.length - this.tagLength * 2
        );

        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");

        const decipher = crypto.createDecipheriv(
          this.algorithm,
          this.secretKey,
          iv
        );
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, "hex", "utf8");
        decrypted += decipher.final("utf8");

        const payload = JSON.parse(decrypted);

        // Check expiration
        const now = Date.now();
        const age = now - payload.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000;

        if (age > maxAge) {
          return { valid: false, reason: "PPK expired", payload };
        }

        return {
          valid: true,
          payload,
          info: payload,
          age,
          generatedAt: new Date(payload.timestamp).toISOString(),
        };
      }

      return { valid: false, reason: "PPK too short for decryption" };
    } catch (error) {
      return {
        valid: false,
        reason: "Decryption failed",
        error: error.message,
      };
    }
  }
}

const ppkSystem = new EncryptedPPKSystem("your-master-private-key-2024");
// Example usage
const newPPK = ppkSystem.generatePPK({
  type: "visitor",
  workspaceId: "66fa550bcb1256387c2e6e3c",
});
console.log("Generated PPK:", newPPK.ppk);

const verifiedPPK = ppkSystem.verifyPPK(
  "78ebb18a6e4fe17ac8f031cde584d81b5214b3fdca6b039bac0758b641d0b558"
);
console.log("Verified PPK:", verifiedPPK);
