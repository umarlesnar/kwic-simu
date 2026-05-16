import React, { useState, useRef, useEffect } from "react";
import { MdHttp } from "react-icons/md";
import { toast } from "react-toastify";
import { WebhookService } from "@api/WebhookService";
import {
  buildGroupCreateFail,
  buildGroupCreateSuccess,
  buildGroupDeleteFail,
  buildGroupJoinRequestCreated,
  buildGroupJoinRequestRevoked,
  buildGroupMessageFailed,
  buildGroupParticipantsRemovePartialFail,
  buildGroupParticipantsRemoveTotalFail,
  buildGroupSettingsPartialFail,
  buildGroupSettingsTotalFail,
  buildGroupSuspend,
  buildGroupSuspendCleared,
} from "../utils/wbGroupFailedWebhooks";

const scenarios = [
  { id: "create_success", label: "group_create (success)", fn: buildGroupCreateSuccess },
  { id: "create_fail", label: "group_create (fail)", fn: buildGroupCreateFail },
  { id: "delete_fail", label: "group_delete (fail)", fn: buildGroupDeleteFail },
  { id: "remove_partial", label: "participants_remove (partial fail)", fn: buildGroupParticipantsRemovePartialFail },
  { id: "remove_total", label: "participants_remove (total fail)", fn: buildGroupParticipantsRemoveTotalFail },
  { id: "settings_partial", label: "settings_update (partial fail)", fn: buildGroupSettingsPartialFail },
  { id: "settings_total", label: "settings_update (total fail)", fn: buildGroupSettingsTotalFail },
  { id: "suspend", label: "group_suspend", fn: buildGroupSuspend },
  { id: "suspend_cleared", label: "group_suspend_cleared", fn: buildGroupSuspendCleared },
  { id: "msg_failed", label: "group message status failed", fn: buildGroupMessageFailed },
  {
    id: "join_request_created",
    label: "join request created (user requests)",
    fn: (wba, pn, g) =>
      buildGroupJoinRequestCreated(wba, pn, g, {
        wa_id: "15550009999",
        join_request_id: g?.join_requests?.[0]?.join_request_id || "sim_join_req_id",
        reason: "invite_link",
      }),
  },
  {
    id: "join_request_revoked",
    label: "join request revoked (user cancels)",
    fn: (wba, pn, g) =>
      buildGroupJoinRequestRevoked(wba, pn, g, {
        wa_id: "15550009999",
        join_request_id: g?.join_requests?.[0]?.join_request_id || "sim_join_req_id",
        reason: "invite_link",
      }),
  },
];

export default function GroupFailedWebhookMenu({ phone_number_id, wba_id, group }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const push = async (build) => {
    try {
      const payload = build(wba_id, phone_number_id, group);
      await WebhookService.push(payload);
      toast.success("Webhook pushed to stream");
      setOpen(false);
    } catch (e) {
      toast.error(e.message || "Push failed");
    }
  };

  return (
    <div className="absolute self-center" ref={ref}>
      <button
        type="button"
        title="Push sample failed-operation group webhooks (manual)"
        onClick={() => setOpen(!open)}
        className="p-2 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
      >
        <MdHttp className="text-lg" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1 text-left">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-100 dark:border-gray-700">
            Failed / edge webhooks
          </div>
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => push(s.fn)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
