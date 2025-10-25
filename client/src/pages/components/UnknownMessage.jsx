import { useSearchParams } from "react-router-dom";
import WhatsappService from "./WhatsappServicer";

function UnknownMessage() {
  const [searchParams] = useSearchParams();
  const wba_id = searchParams.get("wba_id");
  const phone_number_id = searchParams.get("phone_number_id");
  const display_phone_number = searchParams.get("display_phone_number");
  const wa_id = searchParams.get("wa_id");

  const onsubmit = () => {
    const Webhook = new WhatsappService(
      wba_id,
      phone_number_id,
      display_phone_number,
      "the-catalog_id",
      wa_id
    );
    Webhook.profileName = "Kerry Fisher";

    const errorCode = 130501;
    const errorTitle = "Unsupported message type";
    const errorDetails = "Message type is not currently supported";
    const message = Webhook.pushUnknownMessage(
      errorCode,
      errorTitle,
      errorDetails
    );

    console.log(message);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-red-300">
        Send Unknown Message
      </button>
    </>
  );
}

export default UnknownMessage;
