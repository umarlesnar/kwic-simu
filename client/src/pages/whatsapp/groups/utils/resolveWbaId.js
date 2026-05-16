import axios from "axios";

const cache = new Map();

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };
}

/**
 * Resolves the WBA id for a phone number via the groups context API (Redis-backed).
 */
export async function resolveWbaIdForPhone(phone_number_id) {
  if (!phone_number_id) return null;
  if (cache.has(phone_number_id)) return cache.get(phone_number_id);

  const response = await axios.get(
    `/v14.0/${phone_number_id}/groups/context`,
    { headers: authHeaders() }
  );
  const wbaId = response.data?.wba_id;
  if (wbaId) cache.set(phone_number_id, wbaId);
  return wbaId || null;
}
