import { useSearchParams } from "react-router-dom";
import WhatsappService from "../WhatsappServicer";

function ReceivedOrderMessage() {
  const [searchParams] = useSearchParams();
  const wba_id = searchParams.get("wba_id");
  const phone_number_id = searchParams.get("phone_number_id");
  const display_phone_number = searchParams.get("display_phone_number");
  const wa_id = searchParams.get("wa_id");
  const productItemsParam = searchParams.get("productItems");

  const onsubmit = () => {
    let productItems = [];
    try {
      productItems = productItemsParam
        ? JSON.parse(decodeURIComponent(productItemsParam))
        : [];
    } catch (error) {
      console.error("Error parsing productItems from URL", error);
    }

    const Webhook = new WhatsappService(
      wba_id,
      phone_number_id,
      display_phone_number,
      "the-catalog_id",
      wa_id
    );
    Webhook.profileName = "Hello Kwic";
    const message = Webhook.pushOrderRecivedMessage(productItems);

    console.log(message);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        Received Order
      </button>
    </>
  );
}

export default ReceivedOrderMessage;
