import { useSearchParams } from "react-router-dom";
import WhatsappService from "../WhatsappServicer";
import { WebhookService } from "@api/WebhookService";

function WbAccountTemplateUpdate() {
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
      wa_id
    );
    const message = Webhook.WbAccountUpdate();

    console.log(message);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        WbAccount Template Update
      </button>
    </>
  );
}

export default WbAccountTemplateUpdate;
