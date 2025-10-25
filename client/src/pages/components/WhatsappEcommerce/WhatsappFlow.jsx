import { useSearchParams } from "react-router-dom";
import WhatsappService from "../WhatsappServicer";

function Flow() {
  const [searchParams] = useSearchParams();
  const wba_id = searchParams.get("wba_id");

  const onsubmit = () => {
    const Webhook = new WhatsappService(wba_id);

    const flowEvent = Webhook.pushFlowStatusChangeEvent(
      "1372735903682123",
      "sent",
      "delivered"
    );
    Webhook.old_status = "ajbbakjb";
    console.log(flowEvent);
  };

  return (
    <>
      <button onClick={onsubmit} className="bg-green-300">
        Flow
      </button>
    </>
  );
}

export default Flow;
