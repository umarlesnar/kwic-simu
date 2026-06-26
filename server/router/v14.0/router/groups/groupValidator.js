/**
 * Group Input Validation
 * Validates all incoming requests for the Groups API
 */

const {
  isValidPhoneNumberId,
  isValidGroupId,
  isValidPhoneNumber,
  isValidJoinRequestClientId,
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
  if (req.body.subject !== undefined) {
    if (typeof req.body.subject !== "string") {
      errors.push("Subject must be a string");
    } else {
      const trimmedSubject = req.body.subject.trim();
      if (trimmedSubject.length === 0) {
        errors.push("Subject must not be empty");
      } else if (trimmedSubject.length > 128) {
        errors.push("Subject length exceeds maximum of 128 characters");
      }
    }
  }

  // Validate description
  if (req.body.description !== undefined) {
    if (typeof req.body.description !== "string") {
      errors.push("Description must be a string");
    } else if (req.body.description.length > 2048) {
      errors.push("Description length exceeds maximum of 2048 characters");
    }
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
  if (req.body.subject !== undefined) {
    if (typeof req.body.subject !== "string") {
      errors.push("Subject must be a string");
    } else {
      const trimmedSubject = req.body.subject.trim();
      if (trimmedSubject.length === 0) {
        errors.push("Subject must not be empty if provided");
      } else if (trimmedSubject.length > 128) {
        errors.push("Subject length exceeds maximum of 128 characters");
      }
    }
  }

  // Validate description if provided
  if (req.body.description !== undefined) {
    if (typeof req.body.description !== "string") {
      errors.push("Description must be a string");
    } else if (req.body.description.length > 2048) {
      errors.push("Description length exceeds maximum of 2048 characters");
    }
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

  // Validate profile_picture_file if provided
  if (req.body.profile_picture_file !== undefined) {
    if (typeof req.body.profile_picture_file !== "string") {
      errors.push("profile_picture_file must be a string path");
    } else {
      const lowerPath = req.body.profile_picture_file.toLowerCase();
      if (!lowerPath.endsWith(".jpg") && !lowerPath.endsWith(".jpeg")) {
        errors.push("Only support mime type image/jpeg");
      } else {
        try {
          const fs = require("fs");
          if (fs.existsSync(req.body.profile_picture_file)) {
            const stats = fs.statSync(req.body.profile_picture_file);
            if (stats.size > 5 * 1024 * 1024) {
              errors.push("Maximum size: 5MB");
            }
          }
        } catch (e) {
          // ignore fs check error
        }
      }
    }
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

  // Validate messaging_product in body
  if (!req.body?.messaging_product || req.body.messaging_product !== "whatsapp") {
    errors.push('messaging_product must be "whatsapp"');
  }

  // Two supported shapes:
  // 1) Bulk remove via body.participants (Meta format)
  // 2) Legacy remove via :wa_id path param (if ever added later)
  if (req.params.wa_id !== undefined) {
    if (!isValidPhoneNumber(req.params.wa_id)) {
      errors.push("Invalid wa_id format");
    }
  } else {
    const participants = req.body?.participants;
    if (!Array.isArray(participants) || participants.length === 0) {
      errors.push("participants must be a non-empty array");
    } else {
      if (participants.length > 8) {
        errors.push("Maximum 8 participants allowed");
      }
      const waIds = participants
        .map((p) => (typeof p === "string" ? p : p.user || p.wa_id))
        .filter(Boolean);
      if (waIds.length === 0) {
        errors.push("participants must include at least one valid user");
      } else {
        const invalid = waIds.filter((waId) => !isValidPhoneNumber(waId));
        if (invalid.length > 0) {
          errors.push("Invalid wa_id format in participants array");
        }
      }
    }
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

  // Validate messaging_product in body
  if (!req.body?.messaging_product || req.body.messaging_product !== "whatsapp") {
    errors.push('messaging_product must be "whatsapp"');
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

  const validation = validateRequiredFields(req.body, ["messaging_product", "join_requests"]);
  if (!validation.isValid) {
    errors.push(`Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (req.body.messaging_product && req.body.messaging_product !== "whatsapp") {
    errors.push('messaging_product must be "whatsapp"');
  }

  if (req.body.join_requests) {
    if (!Array.isArray(req.body.join_requests) || req.body.join_requests.length === 0) {
      errors.push("join_requests must be a non-empty array");
    } else {
      const invalid = req.body.join_requests.filter((id) => !isValidJoinRequestClientId(id));
      if (invalid.length > 0) {
        errors.push("Invalid join_request_id or wa_id in join_requests array");
      }
    }
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

  const validation = validateRequiredFields(req.body, ["messaging_product", "join_requests"]);
  if (!validation.isValid) {
    errors.push(`Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (req.body.messaging_product && req.body.messaging_product !== "whatsapp") {
    errors.push('messaging_product must be "whatsapp"');
  }

  if (req.body.join_requests) {
    if (!Array.isArray(req.body.join_requests) || req.body.join_requests.length === 0) {
      errors.push("join_requests must be a non-empty array");
    } else {
      const invalid = req.body.join_requests.filter((id) => !isValidJoinRequestClientId(id));
      if (invalid.length > 0) {
        errors.push("Invalid join_request_id or wa_id in join_requests array");
      }
    }
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

  if (req.query.after && typeof req.query.after !== "string") {
    errors.push("after must be a string cursor");
  }

  if (req.query.before && typeof req.query.before !== "string") {
    errors.push("before must be a string cursor");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates join group by invite link request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateJoinGroupByInviteLinkRequest(req) {
  const errors = [];

  const validation = validateRequiredFields(req.body, ["invite_link", "wa_id"]);
  if (!validation.isValid) {
    errors.push(`Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (req.body.wa_id && !isValidPhoneNumber(req.body.wa_id)) {
    errors.push("Invalid wa_id format");
  }

  if (req.body.invite_link && typeof req.body.invite_link !== "string") {
    errors.push("Invite link must be a string");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates leave group request
 * @param {object} req - Express request object
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateLeaveGroupRequest(req) {
  const errors = [];

  const validation = validateRequiredFields(req.body, ["group_id", "wa_id"]);
  if (!validation.isValid) {
    errors.push(`Missing required fields: ${validation.missingFields.join(", ")}`);
  }

  if (req.body.wa_id && !isValidPhoneNumber(req.body.wa_id)) {
    errors.push("Invalid wa_id format");
  }

  if (req.body.group_id && typeof req.body.group_id !== "string") {
    errors.push("Group ID must be a string");
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
  validateJoinGroupByInviteLinkRequest,
  validateLeaveGroupRequest,
};
