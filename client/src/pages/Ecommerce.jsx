import React from "react";
import OrderAddressMessage from "./components/WhatsappEcommerce/OrderAddress";
import ReceivedOrderMessage from "./components/WhatsappEcommerce/ReceivedOrderMessage";
import Flow from "./components/WhatsappEcommerce/WhatsappFlow";
import { GoArrowLeft } from "react-icons/go";
import { Link } from "react-router-dom";

function Ecommerce() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container-primary py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">
            <GoArrowLeft className="text-xl" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-primary py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <OrderAddressMessage />
          <ReceivedOrderMessage />
          <Flow />
        </div>
      </div>
    </div>
  );
}

export default Ecommerce;
