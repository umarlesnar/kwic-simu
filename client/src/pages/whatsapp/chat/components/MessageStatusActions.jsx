import { BiCheck, BiCheckDouble } from "react-icons/bi";
import { TbStatusChange } from "react-icons/tb";
import WbMessageStatus from "@utils/WBMessageStatus";
import { WebhookService } from "@api/WebhookService";

const MessageStatusActions = ({
  message,
  phone_number_id,
  wba_id,
  refreshMessages,
  showPopup,
  setShowPopup,
}) => {
  const handleBtnNavigation = async (type) => {
    try {
      const webhook_payload = new WbMessageStatus(
        (message.to || "").toString().replace(/\s+/g, ""),
        phone_number_id,
        wba_id
      );
      webhook_payload.type = type;
      webhook_payload.messageId = message.id;
      webhook_payload.wa_id =
        message.direction === "incoming" ? message.from : message.to;
      webhook_payload.conversation =
        typeof message.conversation === "string"
          ? JSON.parse(message.conversation)
          : message.conversation;
      await WebhookService.push(webhook_payload.getObject());
      await refreshMessages();
      setShowPopup(false);
    } catch (error) {
      // Handle error silently
    }
  };

  const handleError = async (errorCode) => {
    try {
      const displayPhone = (message.to || "").toString().replace(/\s+/g, "");
      const webhook_payload = new WbMessageStatus(displayPhone, phone_number_id, wba_id);
      webhook_payload.type = "failed";
      webhook_payload.error_code = errorCode;
      webhook_payload.messageId = message.id;
      webhook_payload.wa_id = message.direction === 'incoming' ? message.from : message.to;
      webhook_payload.conversation =
        typeof message.conversation === "string"
          ? JSON.parse(message.conversation)
          : message.conversation;

      await WebhookService.push(webhook_payload.getObject());
      if (typeof refreshMessages === 'function') await refreshMessages();
      setShowPopup(false);
    } catch (err) {
      console.error('MessageStatusActions.handleError', err);
    }
  };

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setShowPopup(true);
        }}
        className="cursor-pointer"
      >
        <TbStatusChange className="text-xl text-blue-500" />
      </div>
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Message Status Actions
              </h3>
              <button
                onClick={() => setShowPopup(false)}
                className="text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-green-600 mb-2">Success</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => handleBtnNavigation("sent")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-white bg-white border rounded-md"
                  >
                    <BiCheck className="text-green-600" /> Sent
                  </button>
                  <button
                    onClick={() => handleBtnNavigation("delivered")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-white bg-white border rounded-md"
                  >
                    <BiCheckDouble className="text-gray-400" /> Delivered
                  </button>
                  <button
                    onClick={() => handleBtnNavigation("read")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-white bg-white border rounded-md"
                  >
                    <BiCheckDouble className="text-blue-700" /> Read
                  </button>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-2">Fail</h4>
                <div className="space-y-2">
                  <button onClick={() => handleError(WbMessageStatus.ERROR_CODES[131047] || '131047')} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 bg-white border rounded-md">
                    Re-engagement
                  </button>
                  <button onClick={() => handleError(WbMessageStatus.ERROR_CODES[130472] || '130472')} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 bg-white border rounded-md">
                    User experiment
                  </button>
                  <button onClick={() => handleError(WbMessageStatus.ERROR_CODES[131026] || '131026')} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 bg-white border rounded-md">
                    Undeliverable
                  </button>
                  <button onClick={() => handleError(WbMessageStatus.ERROR_CODES[131049] || '131049')} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-100 bg-white border rounded-md">
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

export default MessageStatusActions;
