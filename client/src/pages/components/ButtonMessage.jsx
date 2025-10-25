import { useSearchParams } from "react-router-dom";
import WhatsappService from "./WhatsappServicer";

function ButtonMessage() {
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

    const buttonText = "No";
    const payload = "No-Button-Payload";
    const contextFrom = "16505553333";
    const contextId = "wamid.gBGGFlCGg0cvAgkLFm4e9tICiTI";

    const message = Webhook.pushButtonMessage(
      buttonText,
      payload,
      contextFrom,
      contextId
    );

    console.log(message);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        Send Button Message
      </button>
    </>
  );
}

export default ButtonMessage;
