import { useSearchParams } from "react-router-dom";
import WhatsappService from "./WhatsappServicer";

function StickerMessage() {
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

    const stickerId = "sticker-id-example";
    const animated = false;
    const mimeType = "image/webp";
    const hash = "example-sticker-hash";

    const message = Webhook.pushStickerMessage(
      stickerId,
      animated,
      mimeType,
      hash
    );

    console.log(message);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        Send Sticker Message
      </button>
    </>
  );
}

export default StickerMessage;
