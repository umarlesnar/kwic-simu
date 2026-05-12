import React, { useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { businessService } from "../../../framework/api/businessService";
import { SearchBar } from "../common/SearchBar";
import { FilterDropdown } from "../common/FilterDropdown";
import { Pagination } from "../common/Pagination";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useNavigate, useSearchParams } from "react-router-dom";

const PhoneNumberTable = ({ wba_id }) => {
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
      const response = await businessService.getAllPhoneNumbers(
        wba_id,
        currentPage,
        10
      );
      setBusinesses(response.data);
      setTotalPages(1);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, wba_id]);

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
    const url = `/simulator/msg/${wba_id}/${id}`;
    const popup = window.open(url, "MockFacebookLogin", "width=400,height=500");
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
      const matchesSearch = business.id
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
  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 text-red-800 dark:text-red-200">
      <div className="flex items-center gap-2">
        <span>{error}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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

      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {["Phone Number Id", "WBA ID", "Actions"].map((header) => (
                  <th
                    key={header}
                    onClick={() => handleSort(header.toLowerCase())}
                    className="table-header cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {header}
                      {sortField === header.toLowerCase() && (
                        <span className="text-lg leading-none">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBusinesses.length > 0 ? (
                filteredBusinesses.map((business) => (
                  <tr key={business.app_id} className="table-row hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell">
                      <span className="font-medium text-gray-900 dark:text-white">{business.id}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-gray-600 dark:text-gray-400">{wba_id}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(business.id)}
                          className="btn-small inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="table-cell text-center py-8">
                    <div className="text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>No phone numbers found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default PhoneNumberTable;
