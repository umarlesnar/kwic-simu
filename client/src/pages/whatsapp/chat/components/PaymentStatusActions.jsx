import WBOrderStatus from "@utils/WBOrderStatus";
import { WebhookService } from "@api/WebhookService";
import { HiCurrencyDollar } from "react-icons/hi2";

const PaymentStatusActions = ({
  message,
  phone_number_id,
  wba_id,
  refreshMessages,
}) => {
  const handlePaymentStatus = async (type) => {
    try {
      const webhook_payload = new WBOrderStatus(
        (message.to || "").toString().replace(/\s+/g, ""),
        phone_number_id,
        wba_id
      );
      webhook_payload.type = type;
      webhook_payload.messageId = message.id;
      webhook_payload.wa_id =
        message.direction === "incoming" ? message.from : message.to;
      
      const orderData = message.interactiveData?.action?.parameters;
      if (orderData) {
        webhook_payload.referenceId = orderData.reference_id || "";
        webhook_payload.amount = orderData.total_amount || { value: 0, offset: 100 };
        webhook_payload.currency = orderData.currency || "INR";
      }

      await WebhookService.push(webhook_payload.getObject());
      await refreshMessages();
    } catch (error) {
      console.error("PaymentStatusActions error:", error);
    }
  };

  return (
    <div className="flex gap-1">
      <div
        onClick={(e) => {
          e.stopPropagation();
          handlePaymentStatus("captured");
        }}
        className="cursor-pointer"
        title="Payment Success"
      >
        <HiCurrencyDollar className="text-xl text-green-500" />
      </div>
      <div
        onClick={(e) => {
          e.stopPropagation();
          handlePaymentStatus("failed");
        }}
        className="cursor-pointer"
        title="Payment Failure"
      >
        <HiCurrencyDollar className="text-xl text-red-500" />
      </div>
    </div>
  );
};

export default PaymentStatusActions;
