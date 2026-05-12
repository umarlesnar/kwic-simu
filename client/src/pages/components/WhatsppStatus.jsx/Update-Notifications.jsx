import React from "react";
import { useSearchParams } from "react-router-dom";
import WhatsappService from "../WhatsappServicer";

function UpdateNotifications() {
  const [searchParams] = useSearchParams();
  const wba_id = searchParams.get("wba_id");
  const phone_number_id = searchParams.get("phone_number_id");
  const display_phone_number = searchParams.get("display_phone_number");

  const sentstatus = () => {
    const product_items = [];

    const Webhook = new WhatsappService(
      wba_id,
      phone_number_id,
      display_phone_number
    );
    Webhook.status = "UpdateNotifications";
    const message = Webhook.UpdateNotification(product_items);

    console.log(message);
  };

  return (
    <>
      <button onClick={() => sentstatus(wba_id, "sent")}>
        Update Notifications
      </button>
    </>
  );
}

export default UpdateNotifications;
