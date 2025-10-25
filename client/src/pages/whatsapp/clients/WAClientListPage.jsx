import React from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { GoArrowLeft } from "react-icons/go";
import WBAClientTable from "./components/table/WBAClientTable";

function WAClientListPage() {
  const { wba_id, phone_number_id } = useParams(); // Get URL parameters
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Reading query parameters
  const catalog_id = searchParams.get("catalog_id");
  const source = searchParams.get("source");
  const view = searchParams.get("view");
  // Reading state if passed
  const { state } = location;
  return (
    <div className="min-h-screen h-auto  bg-green-400">
      <div className="px-3 py-2 border-b border-[#1a1a1a]   ">
        <Link to="/whatsapp" className="flex gap-2 items-center ">
          <GoArrowLeft className="text-2xl text-black" />
          <span className="text-black font-semibold">Back</span>
        </Link>
      </div>
      <div className="mx-auto p-3 md:p-6">
        <WBAClientTable phone_number_id={phone_number_id} wba_id={wba_id} catalog_id={catalog_id} />
      </div>
    </div>
  );
}

export default WAClientListPage;
