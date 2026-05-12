import React from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";

function WABusinessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-primary py-6">
          <h1 className="header-primary text-gray-900 dark:text-white">WABusiness Accounts</h1>
        </div>
      </div>
    </div>
  );
}

export default WABusinessPage;
