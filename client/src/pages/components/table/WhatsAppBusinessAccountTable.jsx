import React, { useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { businessService } from "../../../framework/api/businessService";
import { SearchBar } from "../common/SearchBar";
import { FilterDropdown } from "../common/FilterDropdown";
import { Pagination } from "../common/Pagination";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useNavigate, useSearchParams } from "react-router-dom";

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
        <FilterDropdown
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: "all", label: "All Status" },
            { value: "Active", label: "Active" },
            { value: "Inactive", label: "Inactive" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Phone Number Id",
                "WBA Id",
                "Display Phone Number",
                "Actions",
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
              <tr key={business.app_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {business.id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{business.wba_id}</div>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 ring-1 ring-pink-700/10 ring-inset cursor-pointer">
                      Template
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {business.display_phone_number}
                    <div className="mt-1 flex justify-start gap-2">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer">
                        Message In
                      </span>
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset cursor-pointer">
                        Clients
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(business.wba_id)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded
                                 bg-green-50 text-green-600 hover:bg-green-100
                                 transition-colors duration-200"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      View
                    </button>
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
