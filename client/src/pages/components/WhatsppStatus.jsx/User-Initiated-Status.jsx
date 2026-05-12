import { useSearchParams } from "react-router-dom";
import WhatsappService from "../WhatsappServicer";

function UserInitiatedStatus() {
  const [searchParams] = useSearchParams();
  const wba_id = searchParams.get("wba_id");
  const phone_number_id = searchParams.get("phone_number_id");
  const display_phone_number = searchParams.get("display_phone_number");
  const conversation_id = searchParams.get("conversation_id");
  const wa_id = searchParams.get("wa_id");

  const onsubmit = () => {
    const product_items = [];

    const Webhook = new WhatsappService(
      wba_id,
      phone_number_id,
      display_phone_number,
      "the-catalog_id",
      wa_id,
      "status",
      "error_code",
      conversation_id
    );
    const message = Webhook.UserInitiatedStatus(product_items);

    console.log(message);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        User Initiated Status
      </button>
    </>
  );
}

export default UserInitiatedStatus;
