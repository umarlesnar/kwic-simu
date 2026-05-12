/**
 * Error Handler Utilities
 * Provides consistent error handling and response formatting
 */

const { HTTP_STATUS, ERROR_MESSAGES } = require("./constants");

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} details - Additional error details
 * @returns {object} Error response object
 */
function createErrorResponse(message, statusCode, details = null) {
  const response = {
    error: message,
    code: statusCode,
  };

  if (details) {
    response.details = details;
  }

  return response;
}

/**
 * Sends an error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} details - Additional error details
 */
function sendErrorResponse(res, statusCode, message, details = null) {
  const errorResponse = createErrorResponse(message, statusCode, details);
  res.status(statusCode).json(errorResponse);
}

/**
 * Validates phone_number_id format
 * @param {string} phoneNumberId - Phone number ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPhoneNumberId(phoneNumberId) {
  return typeof phoneNumberId === "string" && phoneNumberId.startsWith("12");
}

/**
 * Validates group_id format
 * @param {string} groupId - Group ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidGroupId(groupId) {
  return (
    typeof groupId === "string" &&
    (groupId.includes("@g.us") || /^[a-zA-Z0-9_-]+$/.test(groupId))
  );
}

/**
 * Validates phone number format (wa_id)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPhoneNumber(phoneNumber) {
  return typeof phoneNumber === "string" && /^\d{10,15}$/.test(phoneNumber);
}

/**
 * Validates join_approval_mode
 * @param {string} mode - Join approval mode to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidJoinApprovalMode(mode) {
  return mode === "on_approval" || mode === "off";
}

/**
 * Validates required fields in request body
 * @param {object} body - Request body
 * @param {array} requiredFields - Array of required field names
 * @returns {object} Object with isValid boolean and missingFields array
 */
function validateRequiredFields(body, requiredFields) {
  const missingFields = requiredFields.filter(
    (field) => !body.hasOwnProperty(field) || body[field] === undefined
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validates phone numbers array
 * @param {array} phoneNumbers - Array of phone numbers to validate
 * @returns {object} Object with isValid boolean and invalidNumbers array
 */
function validatePhoneNumbersArray(phoneNumbers) {
  if (!Array.isArray(phoneNumbers)) {
    return {
      isValid: false,
      invalidNumbers: ["Input must be an array"],
    };
  }

  const invalidNumbers = phoneNumbers.filter(
    (num) => !isValidPhoneNumber(num)
  );

  return {
    isValid: invalidNumbers.length === 0,
    invalidNumbers,
  };
}

/**
 * Handles validation errors and sends appropriate response
 * @param {object} res - Express response object
 * @param {string} fieldName - Name of the field that failed validation
 * @param {string} reason - Reason for validation failure
 */
function handleValidationError(res, fieldName, reason) {
  sendErrorResponse(
    res,
    HTTP_STATUS.BAD_REQUEST,
    `Invalid ${fieldName}: ${reason}`
  );
}

module.exports = {
  createErrorResponse,
  sendErrorResponse,
  isValidPhoneNumberId,
  isValidGroupId,
  isValidPhoneNumber,
  isValidJoinApprovalMode,
  validateRequiredFields,
  validatePhoneNumbersArray,
  handleValidationError,
};
