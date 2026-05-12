import { useSearchParams } from "react-router-dom";
import WhatsappService from "./WhatsappServicer";

function LocationMessage() {
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

    const latitude = "40.712776";
    const longitude = "-74.005974";
    const locationName = "New York City";
    const locationAddress = "New York, NY, USA";

    const message = Webhook.pushLocationMessage(
      latitude,
      longitude,
      locationName,
      locationAddress
    );

    console.log(message);
  };

  return (
    <div className="card-elevated p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col h-full">
        <button onClick={onsubmit} className="btn-primary mt-auto w-full">
          Send Location
        </button>
      </div>
    </div>
  );
}

export default LocationMessage;
