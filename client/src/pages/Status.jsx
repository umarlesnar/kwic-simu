import React from "react";
import OrderStatusMassage from "./components/WhatsppStatus.jsx/Order-Status-Massage";
import UpdateNotifications from "./components/WhatsppStatus.jsx/Update-Notifications";
import DeletedStatus from "./components/WhatsppStatus.jsx/Deleted-Status";
import FailedStatus from "./components/WhatsppStatus.jsx/Failed-Status";
import UserInitiatedStatus from "./components/WhatsppStatus.jsx/User-Initiated-Status";
import { Link } from "react-router-dom";
import { GoArrowLeft } from "react-icons/go";
function Status() {
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
          <OrderStatusMassage />
          <UpdateNotifications />
          <DeletedStatus />
          <FailedStatus />
          <UserInitiatedStatus />
        </div>
      </div>
    </div>
  );
}

export default Status;
