import { useSearchParams } from "react-router-dom";
import WhatsappService from "../WhatsappServicer";

function OrderAddressMessage() {
  const [searchParams] = useSearchParams();
  const wba_id = searchParams.get("wba_id");
  const phone_number_id = searchParams.get("phone_number_id");
  const display_phone_number = searchParams.get("display_phone_number");
  const wa_id = searchParams.get("wa_id");
  const body = searchParams.get("body");
  const response_json = searchParams.get("response_json");

  const onsubmit = () => {
    const Webhook = new WhatsappService(
      wba_id,
      phone_number_id,
      display_phone_number,
      "the-catalog_id",
      wa_id
    );
    Webhook.profileName = "Order Address";
    const orderAddressEvent = Webhook.pushOrderAddressMessage(
      response_json,
      body
    );

    console.log(orderAddressEvent);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        Order Address
      </button>
    </>
  );
}

export default OrderAddressMessage;
