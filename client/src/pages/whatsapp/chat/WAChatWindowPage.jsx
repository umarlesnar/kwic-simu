import React, { useState, useCallback, useEffect } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "react-toastify";
import { businessService } from "@api/businessService";

import ImageMessage from "@pages/components/ImageMessage";
import StickerMessage from "@pages/components/StickerImage";
import ContactMessage from "@pages/components/ContactMessage";
import LocationMessage from "@pages/components/LocationMessage";
import ReferralMessage from "@pages/components/ReferralMessage";
import UnknownMessage from "@pages/components/UnknownMessage";
import ButtonMessage from "@pages/components/ButtonMessage";

import ReceivedTextMessage from "@pages/components/ReceivedTextMessage";
import MessageSecurityNotification from "@pages/components/MessageSecurityNotification";
import ChatBot from "./components/ChatBot ";
function WAChatWindowPage() {
  const { wba_id, phone_number_id, wa_id } = useParams(); // Get URL parameters
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Reading query parameters
  const catalog_id = searchParams.get("catalog_id");
  const source = searchParams.get("source");
  const view = searchParams.get("view");
  // Reading state if passed
  const { state } = location;
  const [data, setData] = useState(null);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch businesses
  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      //const response = await businessService.getAllBusinesses(1, 10);
      const response_session = await businessService.getSessionByWaId(
        phone_number_id,
        wa_id
      );
      console.log("response_session", response_session);
      setSession(response_session);
      setData(null);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [phone_number_id, wa_id]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return (
    <ChatBot
      data={data}
      wba_id={wba_id}
      phone_number_id={phone_number_id}
      wa_id={wa_id}
      catalog_id={catalog_id}
      session={session}
    ></ChatBot>
  );
}

export default WAChatWindowPage;
