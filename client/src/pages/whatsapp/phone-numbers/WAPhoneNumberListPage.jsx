import React from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";

import WhatsAppBusinessAccountTable from "./components/table/WhatsAppBusinessAccountTable";

function WAPhoneNumberListPage() {
  return (
    <div className="min-h-screen h-auto bg-green-400">
      <h1 className="px-4 pt-4 pb-2 font-semibold text-gray-800 text-center text-2xl">
        WhatsApp Simulator
      </h1>
      <div className="text-center text-gray-800 text-sm">
        <WhatsAppBusinessAccountTable />
      </div>
    </div>
  );
}

export default WAPhoneNumberListPage;
