import { useSearchParams } from "react-router-dom";
import WhatsappService from "./WhatsappServicer";

function ReferralMessage() {
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

    const sourceUrl = "https://example.com/ad";
    const sourceId = "123456789";
    const sourceType = "ad";
    const headline = "Special Offer";
    const body = "Check out this great offer!";
    const mediaType = "image";
    const imageUrl = "https://example.com/image.jpg";
    const videoUrl = "";
    const thumbnailUrl = "https://example.com/thumbnail.jpg";

    const message = Webhook.pushReferralMessage(
      sourceUrl,
      sourceId,
      sourceType,
      headline,
      body,
      mediaType,
      imageUrl,
      videoUrl,
      thumbnailUrl
    );

    console.log(message);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        Send Referral Message
      </button>
    </>
  );
}

export default ReferralMessage;
