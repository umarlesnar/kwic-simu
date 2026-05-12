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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-3 mb-2 items-center justify-center">
            <div className="py-3">
              <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white">WhatsApp Simulator</h1>
            </div>
        </div>
      </div>

      <div className="text-center container-primary">
        <WhatsAppBusinessAccountTable />
      </div>
    </div>
  );
}

export default WAPhoneNumberListPage;
