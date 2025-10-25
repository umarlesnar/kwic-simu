import React from "react";
import OrderAddressMessage from "./components/WhatsappEcommerce/OrderAddress";
import ReceivedOrderMessage from "./components/WhatsappEcommerce/ReceivedOrderMessage";
import Flow from "./components/WhatsappEcommerce/WhatsappFlow";
import { GoArrowLeft } from "react-icons/go";
import { Link } from "react-router-dom";

function Ecommerce() {
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
          <OrderAddressMessage />
          <ReceivedOrderMessage />
          <Flow />
        </div>
      </div>
    </div>
  );
}

export default Ecommerce;
