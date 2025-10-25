import React, { useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { businessService } from "@api/businessService";
import { SearchBar } from "@common/SearchBar";
import { FilterDropdown } from "@common/FilterDropdown";
import { Pagination } from "@common/Pagination";
import { LoadingSpinner } from "@common/LoadingSpinner";
import { useNavigate, useSearchParams } from "react-router-dom";
import WBPhoneNumberStatus from "@utils/WBPhoneNumberStatus";
import { WebhookService } from "@api/WebhookService";
import { ImSpinner11 } from "react-icons/im";

const GreenTickButton = ({ wba_id, item }) => {
  const handleBtnNavigation = useCallback(
    async (type) => {
      const phoneNumber = new WBPhoneNumberStatus(item.wba_id);
      phoneNumber.type = type;
      phoneNumber.display_phone_number = item.display_phone_number;
      phoneNumber.phone_number_id = item.id;
      phoneNumber.ververified_name = item.verified_name;

      if (type == "GREENTICK") {
        const response = await WebhookService.push(
          phoneNumber.getGreenTickAlertObject()
        );
        console.log("RESPONE", response);
      }
    },
    [item]
  );

  return (
    <div className="mt-1 flex justify-start gap-2">
      <span
        onClick={() => handleBtnNavigation("GREENTICK", item)}
        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
      >
        GREEN TICK
      </span>
    </div>
  );
};

const QualityUpdateButtonGroup = ({ wba_id, item }) => {
  const handleBtnNavigation = useCallback(
    async (type) => {
      const phoneNumber = new WBPhoneNumberStatus(item.wba_id);
      phoneNumber.type = type;
      phoneNumber.display_phone_number = item.display_phone_number;
      phoneNumber.ververified_name = item.verified_name;
      const response = await WebhookService.push(
        phoneNumber.getQualityUpdateObject()
      );
      console.log("RESPONE", response);
    },
    [item]
  );

  return (
    <div className="mt-1 flex justify-start gap-2">
      <span
        onClick={() => handleBtnNavigation("ONBOARDING", item)}
        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
      >
        ONBOARDING
      </span>
      <span
        onClick={() => handleBtnNavigation("TIER_1K", item)}
        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
      >
        TIER_1K
      </span>

      <span
        onClick={() => handleBtnNavigation("TIER_100K", item)}
        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
      >
        TIER_100K
      </span>
    </div>
  );
};

const NameUpdateButtonGroup = ({ wba_id, item }) => {
  const handleBtnNavigation = useCallback(
    async (type) => {
      const phoneNumber = new WBPhoneNumberStatus(item.wba_id);
      phoneNumber.type = type;
      phoneNumber.display_phone_number = item.display_phone_number;
      phoneNumber.ververified_name = item.verified_name;
      const response = await WebhookService.push(
        phoneNumber.getNameStatusObject()
      );
      console.log("RESPONE", response);
    },
    [item]
  );

  return (
    <div className="mt-1 flex justify-start gap-2">
      <span
        onClick={() => handleBtnNavigation("UNKNOWN", item)}
        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
      >
        UNKNOWN
      </span>
      <span
        onClick={() => handleBtnNavigation("YELLOW", item)}
        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
      >
        YELLOW
      </span>
      <span
        onClick={() => handleBtnNavigation("GREEN", item)}
        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
      >
        GREEN
      </span>
      <span
        onClick={() => handleBtnNavigation("RED", item)}
        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
      >
        RED
      </span>
    </div>
  );
};

const WhatsAppBusinessAccountTable = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fetch businesses
  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await businessService.getAllBusinesses(currentPage, 10);
      setBusinesses(response.data);
      setTotalPages(1);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const refresh=()=>{
    fetchBusinesses();
  }
  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this business?")) {
      try {
        await businessService.deleteBusiness(id);
        toast.success("Business deleted successfully");
        fetchBusinesses();
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleView = (id) => {
    // phone-number/:id
    navigate(`/phone-number/${id}`, {
      state: { returnPath: "/" },
    });
  };

  const handleBtnNavigation = useCallback((type, item) => {
    if (type == "MESSAGE_IN") {
      navigate(
        `/whatsapp/incoming/${item.wba_id}/${item.id}?display_phone_number=${item.display_phone_number}`,
        {
          state: { returnPath: "/whatsapp" },
        }
      );
    } else if (type == "CLIENTS") {
      navigate(`/whatsapp/client/${item.wba_id}/${item.id}?catalog_id=${item.catalog_id}`, {
        state: { returnPath: "/whatsapp" },
      });
    } else if (type == "TEMPLATE") {
      navigate(`/whatsapp/template/${item.wba_id}`, {
        state: { returnPath: "/whatsapp" },
      });
    } else if (type == "ECOMMERCE"){
      navigate(`/whatsapp/ecommerce/${item.wba_id}/${item.id}?display_phone_number=${item.display_phone_number}`,
        {
          state: { returnPath: "/whatsapp" },
        }
      );
    } else if (type == "CATALOG"){
      navigate(`/whatsapp/catalog/${item.wba_id}/${item.catalog_id}`,
        {
          state: { returnPath: "/whatsapp" },
        }
      );
    } else {
      console.log("TYPE NOT FOUND");
    }
  }, []);

  // Handle status update
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await businessService.updateBusinessStatus(id, newStatus);
      toast.success("Status updated successfully");
      fetchBusinesses();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort businesses
  const filteredBusinesses = businesses
    .filter((business) => {
      const matchesSearch = business.app_id
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterStatus === "all" || business.app_id === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      return a[sortField] > b[sortField] ? direction : -direction;
    });

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search businesses..."
        />
        <div onClick={refresh} className="bg-green-500 text-white px-4 py-2 rounded cursor-pointer">
          <ImSpinner11 />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Phone Number Id",
                "WBA Id",
                "Display Phone Number",
                "Display Name",
                "QUALITY UPDATE",
              ].map((header) => (
                <th
                  key={header}
                  onClick={() => handleSort(header.toLowerCase())}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    {header}
                    {sortField === header.toLowerCase() && (
                      <span className="ml-2">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBusinesses.map((business) => (
              <tr key={business.app_id} className="hover:bg-gray-50 text-left">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {business.id}
                  </div>
                  <div>
                    <GreenTickButton
                      wba_id={business.wba_id}
                      phone_number_id={business.id}
                      item={business}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{business.wba_id}</div>
                  <div className="mt-1">
                    <span
                      onClick={() => handleBtnNavigation("TEMPLATE", business)}
                      className="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 ring-1 ring-pink-700/10 ring-inset cursor-pointer"
                    >
                      Template
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {business.display_phone_number}
                    <div className="mt-1 flex justify-start gap-2">
                      <span
                        onClick={() =>
                          handleBtnNavigation("MESSAGE_IN", business)
                        }
                        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
                      >
                        Message In
                      </span>
                      <span
                        onClick={() => handleBtnNavigation("CLIENTS", business)}
                        className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset cursor-pointer"
                      >
                        Clients
                      </span>
                      <span
                        onClick={() => handleBtnNavigation("ECOMMERCE", business)}
                        className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-green-600/20 ring-inset cursor-pointer"
                      >
                        Ecommerce
                      </span>
                      <span
                        onClick={() => handleBtnNavigation("CATALOG", business)}
                        className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-green-600/20 ring-inset cursor-pointer"
                      >
                        Catalog
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {business.verified_name}
                    <NameUpdateButtonGroup
                      wba_id={business.wba_id}
                      phone_number_id={business.id}
                      item={business}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    <QualityUpdateButtonGroup
                      wba_id={business.wba_id}
                      phone_number_id={business.id}
                      item={business}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        className="mt-6"
      />
    </div>
  );
};

export default WhatsAppBusinessAccountTable;
