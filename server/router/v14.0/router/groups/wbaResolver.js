/**
 * Resolves WhatsApp Business Account ID from Redis for a phone number or group.
 */

const FALLBACK_WBA_PLACEHOLDER = "1100000000001";

function isPlaceholderWba(wbaId) {
  return !wbaId || wbaId === FALLBACK_WBA_PLACEHOLDER || wbaId === "default_wba";
}

async function discoverWbaIdFromPhoneNumber(redisManager, phoneNumberId) {
  if (!phoneNumberId) return null;
  const pattern = `whatsapp:*:${phoneNumberId}`;
  const results = await redisManager.getValuesByPattern(pattern);
  if (results.length > 0) {
    return results[0].key.split(":")[1];
  }
  return null;
}

async function resolveWbaIdForRequest(redisManager, req) {
  const phoneNumberId =
    req.params.phone_number_id ||
    req.user?.phone_number_id ||
    null;

  if (phoneNumberId && (!req.user || req.user.opaque || isPlaceholderWba(req.user.wba_id))) {
    const discovered = await discoverWbaIdFromPhoneNumber(redisManager, phoneNumberId);
    if (discovered) {
      if (!req.user) req.user = {};
      req.user.wba_id = discovered;
    }
  }

  if (
    req.params.group_id &&
    (!req.user?.wba_id || isPlaceholderWba(req.user.wba_id))
  ) {
    const { getPhoneNumberIdByGroupId } = require("./groupService");
    const pnId =
      req.params.phone_number_id ||
      (await getPhoneNumberIdByGroupId(redisManager, req.params.group_id));
    if (pnId) {
      req.params.phone_number_id = pnId;
      const discovered = await discoverWbaIdFromPhoneNumber(redisManager, pnId);
      if (discovered) {
        if (!req.user) req.user = {};
        req.user.wba_id = discovered;
        req.user.phone_number_id = pnId;
      }
    }
  }
}

function getResolvedWbaId(req) {
  const wbaId = req.user?.wba_id || req.user?.whatsapp_business_account_id;
  return isPlaceholderWba(wbaId) ? null : wbaId;
}

async function resolveWbaIdMiddleware(req, res, next) {
  try {
    await resolveWbaIdForRequest(req.redisManager, req);
  } catch (err) {
    console.error("Error in Smart WBA Resolver:", err);
  }
  next();
}

module.exports = {
  resolveWbaIdMiddleware,
  resolveWbaIdForRequest,
  getResolvedWbaId,
  discoverWbaIdFromPhoneNumber,
  isPlaceholderWba,
};
