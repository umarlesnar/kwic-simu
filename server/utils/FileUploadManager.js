const crypto = require("crypto");

function generateCustomId(
  filename = "WhatsApp Image 2025-02-06 at 5.33.23 PM.jpeg"
) {
  const encodedFilename = Buffer.from(filename).toString("base64"); // Encode filename in base64
  const mimeType = Buffer.from("image/jpeg").toString("base64"); // Encode MIME type in base64
  const randomPart1 = crypto.randomBytes(32).toString("base64url"); // Random string
  const identifier = "e"; // Fixed identifier
  const expiryTimestamp = Math.floor(Date.now() / 1000) + 3600; // Expiry time (1 hour from now)
  const randomPart2 = crypto
    .randomInt(100000000000000, 999999999999999)
    .toString(); // Random large number
  const randomPart3 = crypto
    .randomInt(100000000000000, 999999999999999)
    .toString(); // Another random large number
  const randomPart4 = crypto.randomBytes(16).toString("base64url"); // Another random string

  return `4:${encodedFilename}:${mimeType}:${randomPart1}:${identifier}:${expiryTimestamp}:${randomPart2}:${randomPart3}:${randomPart4}`;
}

function revalidateCustomId(customId) {
  try {
    const parts = customId.split(":");
    if (parts.length !== 8) throw new Error("Invalid format");

    const [
      version,
      encodedFilename,
      encodedMimeType,
      randomPart1,
      identifier,
      expiryTimestamp,
      randomPart2,
      randomPart3,
      randomPart4,
    ] = parts;

    if (version !== "4") throw new Error("Invalid version");

    // Decode filename and MIME type
    const filename = Buffer.from(encodedFilename, "base64").toString("utf-8");
    const mimeType = Buffer.from(encodedMimeType, "base64").toString("utf-8");

    // Check expiry time
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = currentTime > parseInt(expiryTimestamp);

    return {
      filename,
      mimeType,
      identifier,
      expiryTimestamp: new Date(parseInt(expiryTimestamp) * 1000),
      isExpired,
      valid: !isExpired && version === "4",
      message: isExpired ? "Expired" : "Valid",
    };
  } catch (error) {
    return { valid: false, message: "Invalid ID format" };
  }
}

function generateUploadString(
  filename = "WhatsApp Image 2025-02-06 at 5.33.23 PM.jpeg",
  fileType = "image/jpeg",
  fileLength = 314107
) {
  const attachmentId = crypto.randomUUID(); // Generates a unique attachment ID
  const encodedFilename = encodeURIComponent(filename); // Encode filename for URL safety
  const encodedFileType = encodeURIComponent(fileType); // Encode file type
  const fileLengthStr = encodeURIComponent(fileLength.toString()); // Encode file length

  const uploadString = `upload:MT:attachment:${attachmentId}?file_name=${encodedFilename}&file_type=${encodedFileType}&file_length=${fileLengthStr}`;

  // Generate a secure signature using HMAC (for example, using SHA256)
  const secretKey = "your-secret-key"; // Replace with a secure key
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(uploadString)
    .digest("base64url");

  return `${uploadString}&sig=${signature}`;
}

function parseUploadString(uploadString) {
  try {
    const [prefix, params] = uploadString.split("?");
    if (!prefix.startsWith("upload:MT:attachment:"))
      throw new Error("Invalid format");

    const attachmentId = prefix.split(":")[3]; // Extracts the attachment ID
    const queryParams = new URLSearchParams(params);

    // Extract parameters
    const filename = decodeURIComponent(queryParams.get("file_name"));
    const fileType = decodeURIComponent(queryParams.get("file_type"));
    const fileLength = parseInt(queryParams.get("file_length"), 10);
    const signature = queryParams.get("sig");

    if (!filename || !fileType || !fileLength || !signature)
      throw new Error("Missing required fields");

    return {
      attachmentId,
      filename,
      fileType,
      fileLength,
      signature,
      valid: true,
      message: "Upload string is valid",
    };
  } catch (error) {
    return { valid: false, message: error.message };
  }
}

function generateUniqueId() {
  const timestamp = BigInt(Date.now()).toString(32).toUpperCase(); // Encodes timestamp
  const randomBytes = crypto
    .randomBytes(12)
    .toString("base64url")
    .toUpperCase(); // Generates a random string
  const part1 = "HBgL" + timestamp + "VAgA"; // Prefix + Timestamp
  const part2 = "RGBI" + randomBytes.slice(0, 16); // Random part

  return part1 + part2;
}
// // Example Usage
// const exampleUploadString = generateUploadString();
// console.log("Parsed Upload String:", parseUploadString(exampleUploadString));

// // Example Usage
// const generatedId = generateCustomId();
// console.log("Generated ID:", generatedId);

// const validationResult = revalidateCustomId(generatedId);
// console.log("Validation Result:", validationResult);

module.exports = {
  generateUploadString,
  parseUploadString,
  generateCustomId,
  revalidateCustomId,
  generateUniqueId,
};
