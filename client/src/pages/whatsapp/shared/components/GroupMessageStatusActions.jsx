import { useState } from "react";
import { BiCheck, BiCheckDouble } from "react-icons/bi";
import { TbStatusChange } from "react-icons/tb";
import WBGroupMessageStatus from "@utils/WBGroupMessageStatus";
import { WebhookService } from "@api/WebhookService";

const resolveGroupId = (message, fallbackGroupId) =>
  message?.message?.group_id ||
  message?.group_id ||
  fallbackGroupId ||
  "";

const GroupMessageStatusActions = ({
  message,
  phone_number_id,
  wba_id,
  group_id,
  refreshMessages,
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const gid = resolveGroupId(message, group_id);
  const displayPhone = (
    message.phone_number_id ||
    phone_number_id ||
    ""
  )
    .toString()
    .replace(/\s+/g, "");

  const handleBtnNavigation = async (type) => {
    try {
      const webhook_payload = new WBGroupMessageStatus(
        displayPhone,
        phone_number_id,
        wba_id,
        gid
      );
      webhook_payload.type = type;
      webhook_payload.messageId = message.id;
      webhook_payload.participant_wa_id = message.direction === "incoming" ? message.from : null;
      webhook_payload.conversation =
        typeof message.conversation === "string"
          ? JSON.parse(message.conversation)
          : message.conversation;
      await WebhookService.push(webhook_payload.getObject());
      if (typeof refreshMessages === "function") await refreshMessages();
      setShowPopup(false);
    } catch (error) {
      console.error("GroupMessageStatusActions", error);
    }
  };

  const handleAggregatedRead = async () => {
    try {
      const webhook_payload = new WBGroupMessageStatus(
        displayPhone,
        phone_number_id,
        wba_id,
        gid
      );
      webhook_payload.messageId = message.id;
      webhook_payload.conversation =
        typeof message.conversation === "string"
          ? JSON.parse(message.conversation)
          : message.conversation;
      const p1 = message.from || "15550000001";
      const p2 = "15550000002";
      await WebhookService.push(webhook_payload.getAggregatedForParticipants([p1, p2], "read"));
      if (typeof refreshMessages === "function") await refreshMessages();
      setShowPopup(false);
    } catch (error) {
      console.error("GroupMessageStatusActions aggregated", error);
    }
  };

  const handleError = async (errorCode) => {
    try {
      const webhook_payload = new WBGroupMessageStatus(
        displayPhone,
        phone_number_id,
        wba_id,
        gid
      );
      webhook_payload.type = "failed";
      webhook_payload.error_code = errorCode;
      webhook_payload.messageId = message.id;
      await WebhookService.push(webhook_payload.getObject());
      if (typeof refreshMessages === "function") await refreshMessages();
      setShowPopup(false);
    } catch (err) {
      console.error("GroupMessageStatusActions.handleError", err);
    }
  };

  if (!gid) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowPopup(true);
        }}
        className="ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
        title="Group message status webhooks"
      >
        <TbStatusChange className="text-lg text-blue-500" />
      </button>
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Group message status (webhook)
              </h3>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Sends <code className="text-[11px]">recipient_type: &quot;group&quot;</code> status payloads to your webhook stream (matches Cloud API group status shape).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Success</h4>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleBtnNavigation("sent")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"
                  >
                    <BiCheck className="text-green-600" /> Sent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBtnNavigation("delivered")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"
                  >
                    <BiCheckDouble className="text-gray-400" /> Delivered
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBtnNavigation("read")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"
                  >
                    <BiCheckDouble className="text-blue-700" /> Read
                  </button>
                  <button
                    type="button"
                    onClick={handleAggregatedRead}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-md text-indigo-900 dark:text-indigo-100"
                  >
                    Aggregated read (2 participants)
                  </button>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Fail</h4>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleError(WBGroupMessageStatus.ERROR_CODES[131047] || "131047")}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md"
                  >
                    Re-engagement
                  </button>
                  <button
                    type="button"
                    onClick={() => handleError(WBGroupMessageStatus.ERROR_CODES[130472] || "130472")}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md"
                  >
                    User experiment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleError(WBGroupMessageStatus.ERROR_CODES[131026] || "131026")}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md"
                  >
                    Undeliverable
                  </button>
                  <button
                    type="button"
                    onClick={() => handleError(WBGroupMessageStatus.ERROR_CODES[131049] || "131049")}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md"
                  >
                    Ecosystem engagement
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupMessageStatusActions;
