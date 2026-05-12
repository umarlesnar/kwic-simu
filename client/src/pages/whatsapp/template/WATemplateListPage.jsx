import React from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { GoArrowLeft } from "react-icons/go";
import WBATemplateTable from "./components/table/WBATemplateTable";

function WATempateListPage() {
  const { wba_id } = useParams(); // Get URL parameters
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Reading query parameters
  const source = searchParams.get("source");
  const view = searchParams.get("view");
  // Reading state if passed
  const { state } = location;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container-primary py-4">
          <Link to="/whatsapp" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">
            <GoArrowLeft className="text-xl" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      <div className="container-primary py-8 lg:py-12">
        <WBATemplateTable wba_id={wba_id} />
      </div>
    </div>
  );
}

export default WATempateListPage;
