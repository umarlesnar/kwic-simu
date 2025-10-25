import { useSearchParams } from "react-router-dom";
import WhatsappService from "./WhatsappServicer";

function ContactMessage() {
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

    const contactData = {
      addresses: [
        {
          city: "New York",
          country: "USA",
          country_code: "US",
          state: "NY",
          street: "123 Main St",
          type: "HOME",
          zip: "10001",
        },
      ],
      birthday: "1990-01-01",
      emails: [
        {
          email: "kerry.fisher@example.com",
          type: "WORK",
        },
      ],
      name: {
        formatted_name: "Kerry Fisher",
        first_name: "Kerry",
        last_name: "Fisher",
        middle_name: "",
        suffix: "",
        prefix: "Mr.",
      },
      org: {
        company: "Example Corp",
        department: "Engineering",
        title: "Software Engineer",
      },
      phones: [
        {
          phone: "+1234567890",
          wa_id: "1234567890",
          type: "WORK",
        },
      ],
      urls: [
        {
          url: "https://example.com",
          type: "WORK",
        },
      ],
    };

    const message = Webhook.pushContactMessage(contactData);

    console.log(message);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        Send Contact Message
      </button>
    </>
  );
}

export default ContactMessage;
