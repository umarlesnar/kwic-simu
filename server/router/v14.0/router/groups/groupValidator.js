/**
 * Group Input Validation
 * Validates all incoming requests for the Groups API
 */

const {
  isValidPhoneNumberId,
  isValidGroupId,
  isValidPhoneNumber,
  isValidJoinApprovalMode,
  validateRequiredFields,
  validatePhoneNumbersArray,
} = require("./errorHandler");

const { MAX_PARTICIPANTS } = require("./constants");

/**
 * Validates create group request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateCreateGroupRequest(req) {
  const errors = [];

  // Validate phone_number_id
  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  // Validate required fields
  const requiredFields = ["messaging_product", "subject"];
  const validation = validateRequiredFields(req.body, requiredFields);
  if (!validation.isValid) {
    errors.push(
      `Missing required fields: ${validation.missingFields.join(", ")}`
    );
  }

  // Validate messaging_product
  if (req.body.messaging_product && req.body.messaging_product !== "whatsapp") {
    errors.push('messaging_product must be "whatsapp"');
  }

  // Validate subject
  if (req.body.subject && typeof req.body.subject !== "string") {
    errors.push("Subject must be a string");
  }

  // Validate description
  if (req.body.description && typeof req.body.description !== "string") {
    errors.push("Description must be a string");
  }

  // Validate join_approval_mode
  if (
    req.body.join_approval_mode &&
    !["approval_required", "auto_approve"].includes(req.body.join_approval_mode)
  ) {
    errors.push(
      'join_approval_mode must be "approval_required" or "auto_approve"'
    );
  }

  // Validate participant_phone_numbers if provided
  if (req.body.participant_phone_numbers) {
    const phoneValidation = validatePhoneNumbersArray(
      req.body.participant_phone_numbers
    );
    if (!phoneValidation.isValid) {
      errors.push("Invalid phone numbers in participant_phone_numbers");
    }

    // Check participant limit
    if (
      req.body.participant_phone_numbers.length > MAX_PARTICIPANTS
    ) {
      errors.push(`Maximum ${MAX_PARTICIPANTS} participants allowed`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates get group request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateGetGroupRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates update group request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateUpdateGroupRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  // At least one field must be provided
  if (
    !req.body.subject &&
    !req.body.description &&
    !req.body.join_approval_mode
  ) {
    errors.push("At least one field (subject, description, join_approval_mode) must be provided");
  }

  // Validate subject if provided
  if (req.body.subject && typeof req.body.subject !== "string") {
    errors.push("Subject must be a string");
  }

  // Validate description if provided
  if (req.body.description && typeof req.body.description !== "string") {
    errors.push("Description must be a string");
  }

  // Validate join_approval_mode if provided
  if (
    req.body.join_approval_mode &&
    !["approval_required", "auto_approve"].includes(req.body.join_approval_mode)
  ) {
    errors.push(
      'join_approval_mode must be "approval_required" or "auto_approve"'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates delete group request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateDeleteGroupRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates add participants request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateAddParticipantsRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  const validation = validateRequiredFields(req.body, ["phone_numbers"]);
  if (!validation.isValid) {
    errors.push("Missing required field: phone_numbers");
  }

  if (req.body.phone_numbers) {
    const phoneValidation = validatePhoneNumbersArray(req.body.phone_numbers);
    if (!phoneValidation.isValid) {
      errors.push("Invalid phone numbers in phone_numbers array");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates remove participant request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateRemoveParticipantRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  if (!isValidPhoneNumber(req.params.wa_id)) {
    errors.push("Invalid wa_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates get invite link request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateGetInviteLinkRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates reset invite link request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateResetInviteLinkRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates get join requests request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateGetJoinRequestsRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates approve join request request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateApproveJoinRequestRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  if (!isValidPhoneNumber(req.params.wa_id)) {
    errors.push("Invalid wa_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates reject join request request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateRejectJoinRequestRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  if (!isValidPhoneNumber(req.params.wa_id)) {
    errors.push("Invalid wa_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates simulate join request request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateSimulateJoinRequestRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  if (!isValidGroupId(req.params.group_id)) {
    errors.push("Invalid group_id format");
  }

  const validation = validateRequiredFields(req.body, ["wa_id"]);
  if (!validation.isValid) {
    errors.push("Missing required field: wa_id");
  }

  if (req.body.wa_id && !isValidPhoneNumber(req.body.wa_id)) {
    errors.push("Invalid wa_id format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates list groups request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateListGroupsRequest(req) {
  const errors = [];

  if (!isValidPhoneNumberId(req.params.phone_number_id)) {
    errors.push("Invalid phone_number_id format");
  }

  // Validate pagination parameters if provided
  if (req.query.limit) {
    const limit = parseInt(req.query.limit);
    if (isNaN(limit) || limit < 1) {
      errors.push("limit must be a positive integer");
    }
  }

  if (req.query.offset) {
    const offset = parseInt(req.query.offset);
    if (isNaN(offset) || offset < 0) {
      errors.push("offset must be a non-negative integer");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateCreateGroupRequest,
  validateGetGroupRequest,
  validateUpdateGroupRequest,
  validateDeleteGroupRequest,
  validateAddParticipantsRequest,
  validateRemoveParticipantRequest,
  validateGetInviteLinkRequest,
  validateResetInviteLinkRequest,
  validateGetJoinRequestsRequest,
  validateApproveJoinRequestRequest,
  validateRejectJoinRequestRequest,
  validateSimulateJoinRequestRequest,
  validateListGroupsRequest,
};
