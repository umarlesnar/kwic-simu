import React from "react";
import ReceivedTextMessage from "./components/ReceivedTextMessage";
import MessageSecurityNotification from "./components/MessageSecurityNotification";
import ImageMessage from "./components/ImageMessage";
import StickerMessage from "./components/StickerImage";
import ContactMessage from "./components/ContactMessage";
import LocationMessage from "./components/LocationMessage";
import ReferralMessage from "./components/ReferralMessage";
import UnknownMessage from "./components/UnknownMessage";
import ButtonMessage from "./components/ButtonMessage";
import { Link } from "react-router-dom";
import { GoArrowLeft } from "react-icons/go";
function AppMessages() {
  return (
    <div className="h-screen  bg-green-400">
      <div className="px-3 py-2 border-b border-[#1a1a1a]   ">
        <Link to="/" className="flex gap-2 items-center ">
          <GoArrowLeft className="text-2xl text-black" />
          <span className="text-black font-semibold">Back</span>
        </Link>
      </div>
      <div className="md:w-[95%] mx-auto p-6 md:p-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">
          <ReceivedTextMessage />
          <MessageSecurityNotification />
          <ImageMessage />
          <StickerMessage />
          <ContactMessage />
          <LocationMessage />
          <ReferralMessage />
          <UnknownMessage />
          <ButtonMessage />
        </div>
      </div>
    </div>
  );
}

export default AppMessages;
