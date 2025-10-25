import { useSearchParams } from "react-router-dom";
import WhatsappService from "./WhatsappServicer";

function MessageSecrurityNotification() {
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
    Webhook.profileName = "Kerry Fisher";

    const contactName = "Kerry Fisher";
    const fromPhoneNumber = wa_id;
    const textBody = "Hi from new number 3601";
    const identityHash = "Sjvjlx8G6Z0=";
    const identityTimestamp = Date.now().toString();

    const message = Webhook.pushSecurityNotificationMessage(
      contactName,
      wa_id,
      fromPhoneNumber,
      textBody,
      identityHash,
      identityTimestamp
    );

    console.log(message);
  };

  return (
    <>
      <button
        onClick={() => {
          onsubmit();
        }}
        className="bg-green-300"
      >
        Security Notification
      </button>
    </>
  );
}
export default MessageSecrurityNotification;
