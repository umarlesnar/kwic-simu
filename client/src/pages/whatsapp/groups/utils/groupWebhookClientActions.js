import axios from "axios";
import { WebhookService } from "@api/WebhookService";
import { groupsWebhookAuthHeaders } from "./groupsApiHeaders";
import { resolveWbaIdForPhone } from "./resolveWbaId";
import {
  buildGroupJoinRequestCreated,
  buildGroupParticipantsAddInviteLinkSuccess,
  buildGroupJoinRequestsApprovedSuccess,
} from "./wbGroupFailedWebhooks";

async function resolveWba(wba_id, phone_number_id) {
  if (wba_id) return wba_id;
  if (phone_number_id) return resolveWbaIdForPhone(phone_number_id);
  return null;
}

/**
 * Join via invite link: API with client header (skip server webhook) + POST /webhook/push.
 */
export async function joinGroupViaInvite({ invite_link, wa_id, wba_id }) {
  const trimmedWaId = String(wa_id).trim();
  const response = await axios.post(
    "/v14.0/groups/join",
    { invite_link: invite_link.trim(), wa_id: trimmedWaId },
    { headers: groupsWebhookAuthHeaders() }
  );
  const data = response.data;
  const pnId = data.phone_number_id;
  const resolvedWbaId = await resolveWba(wba_id, pnId);

  if (!resolvedWbaId || !pnId) {
    console.warn("joinGroupViaInvite: could not resolve wba_id; webhook push skipped");
    return data;
  }

  if (data.status === "joined") {
    await WebhookService.push(
      buildGroupParticipantsAddInviteLinkSuccess(
        resolvedWbaId,
        pnId,
        data.group_id,
        trimmedWaId
      )
    );
  } else if (data.status === "request_pending") {
    await WebhookService.push(
      buildGroupJoinRequestCreated(
        resolvedWbaId,
        pnId,
        { id: data.group_id },
        {
          wa_id: trimmedWaId,
          join_request_id: data.join_request_id,
          reason: "invite_link",
        }
      )
    );
  }

  return data;
}

/**
 * Approve join request(s): client webhook push for group_participants_add.
 */
export async function approveJoinRequestsViaClient({
  group_id,
  phone_number_id,
  wba_id,
  join_requests,
  joinRequestsList = [],
}) {
  const response = await axios.post(
    `/v14.0/${group_id}/join_requests`,
    {
      messaging_product: "whatsapp",
      join_requests,
    },
    { headers: groupsWebhookAuthHeaders() }
  );

  const resolvedWbaId = await resolveWba(wba_id, phone_number_id);
  const approvedIds = response.data?.approved_join_requests || [];

  if (resolvedWbaId && approvedIds.length > 0) {
    const approvedRows = approvedIds
      .map((id) => {
        const jr = joinRequestsList.find(
          (r) => r.join_request_id === id || r.wa_id === id
        );
        return jr ? { input: jr.wa_id, wa_id: jr.wa_id } : null;
      })
      .filter(Boolean);

    if (approvedRows.length > 0) {
      await WebhookService.push(
        buildGroupJoinRequestsApprovedSuccess(
          resolvedWbaId,
          phone_number_id,
          group_id,
          approvedRows
        )
      );
    }
  }

  return response.data;
}

/**
 * Reject join request(s) from business UI (API only; no standard success webhook).
 */
export async function rejectJoinRequestsViaClient({ group_id, join_requests }) {
  const response = await axios.delete(`/v14.0/${group_id}/join_requests`, {
    data: {
      messaging_product: "whatsapp",
      join_requests,
    },
    headers: groupsWebhookAuthHeaders(),
  });
  return response.data;
}
