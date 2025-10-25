import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useTable, usePagination, useSortBy } from "react-table";
import { toast } from "react-toastify";
import { businessService } from "@api/businessService";
import { SearchBar } from "@common/SearchBar";
import { LoadingSpinner } from "@common/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { ImSpinner11 } from "react-icons/im";

const ActionButtonGroup = ({ data, wba_id, phone_number_id, catalog_id, onDelete }) => {
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBtnNavigation = useCallback(
    (type) => {
      if (type === "CHAT_WINDOW") {
        const absolutePath =
          window.location.origin +
          window.location.pathname +
          `#/whatsapp/chat/${wba_id}/${phone_number_id}/${data.wa_id}?profileName=${data.profile.name}&catalog_id=${catalog_id}`;
        window.open(
          absolutePath,
          `${phone_number_id}-${data.wa_id}`,
          "width=400,height=500"
        );
      }
    },
    [wba_id, phone_number_id, data, catalog_id]
  );
  const handleBlockToggle = () => {
    const payload = {
      messaging_product: "whatsapp",
      block_users: [
        {
          user: data.wa_id,
        },
      ],
    };

    if (isBlocked) {
      console.log("Unblock Payload:", payload);
    } else {
      console.log("Block Payload:", payload);
    }

    setIsBlocked((prev) => !prev);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete this client and all their messages? This action cannot be undone.`)) {
      try {
        setIsDeleting(true);
        await onDelete(data.wa_id);
        toast.success("Client and all messages deleted successfully");
      } catch (error) {
        toast.error("Failed to delete client: " + error.message);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="mt-1 flex justify-start gap-2">
      <span
        onClick={() => handleBtnNavigation("CHAT_WINDOW")}
        className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 cursor-pointer"
      >
        Chat
      </span>
      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 cursor-pointer">
        Marketing
      </span>
      {/* <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/10 cursor-pointer">
        Block / Unblock
      </span> */}
      <span
        onClick={handleBlockToggle}
        className={`inline-flex items-center rounded-md ${
          isBlocked
            ? "bg-yellow-50 text-yellow-700 ring-yellow-600/10"
            : "bg-red-50 text-red-700 ring-red-600/10"
        } px-2 py-1 text-xs font-medium ring-1 cursor-pointer`}
      >
        {isBlocked ? "Unblock" : "Block"}
      </span>

      <span
        onClick={handleDelete}
        disabled={isDeleting}
        className={`inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/10 cursor-pointer ${
          isDeleting ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </span>
    </div>
  );
};

const WBAClientTable = ({ wba_id, phone_number_id, catalog_id }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await businessService.getAllClients(
        phone_number_id,
        currentPage,
        10
      );
      setBusinesses(response.data);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [phone_number_id, currentPage]);

  const handleDeleteClient = useCallback(async (wa_id) => {
    try {
      await businessService.deleteClient(phone_number_id, wa_id);
      // Refresh the list after deletion
      await fetchBusinesses();
    } catch (error) {
      throw error;
    }
  }, [phone_number_id, fetchBusinesses]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const filteredBusinesses = useMemo(
    () =>
      businesses.filter((b) =>
        b.wa_id?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [businesses, searchTerm]
  );

  const columns = useMemo(
    () => [
      { Header: "Id", accessor: (row, i) => i + 1 + (currentPage - 1) * 10 },
      { Header: "Wa Id", accessor: "wa_id" },
      { Header: "Profile Name", accessor: "profile.name" },
      { Header: "Register At", accessor: "created_at" },
      {
        Header: "Action",
        Cell: ({ row }) => (
          <ActionButtonGroup
            data={row.original}
            wba_id={wba_id}
            phone_number_id={phone_number_id}
            catalog_id={catalog_id}
            onDelete={handleDeleteClient}
          />
        ),
      },
    ],
    [wba_id, phone_number_id, currentPage, catalog_id]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    state: { pageIndex },
    pageOptions,
  } = useTable(
    {
      columns,
      data: filteredBusinesses,
      initialState: { pageSize: 10 },
    },
    useSortBy,
    usePagination
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search Clients..."
        />
        <div
          onClick={() => fetchBusinesses()}
          className="bg-green-500 text-white px-4 py-2 rounded cursor-pointer"
        >
          <ImSpinner11 />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg shadow">
        <table {...getTableProps()} className="min-w-full bg-white">
          <thead className="bg-gray-50">
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    {column.render("Header")}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            {...getTableBodyProps()}
            className="bg-white divide-y divide-gray-200 text-black"
          >
            {page.map((row) => {
              prepareRow(row);
              return (
                <tr
                  {...row.getRowProps()}
                  className="hover:bg-gray-50 text-left"
                >
                  {row.cells.map((cell) => (
                    <td
                      {...cell.getCellProps()}
                      className="px-3 py-2 whitespace-nowrap"
                    >
                      {cell.render("Cell")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-4">
        <button
          onClick={previousPage}
          disabled={!canPreviousPage}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {pageIndex + 1} of {pageOptions.length}
        </span>
        <button
          onClick={nextPage}
          disabled={!canNextPage}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default WBAClientTable;
