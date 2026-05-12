import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useTable, usePagination, useSortBy } from "react-table";
import { toast } from "react-toastify";
import { businessService } from "@api/businessService";
import { SearchBar } from "@common/SearchBar";
import { LoadingSpinner } from "@common/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { ImSpinner11 } from "react-icons/im";
import { IoAddCircle } from "react-icons/io5";

const ActionButtonGroup = ({ data, wba_id, phone_number_id, catalog_id, onDelete, onRename }) => {
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

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

  const handleRename = async () => {
    const newName = window.prompt("Enter new name:", data.profile.name);
    if (newName && newName.trim() !== "" && newName !== data.profile.name) {
      try {
        setIsRenaming(true);
        await onRename(data.wa_id, newName.trim());
        toast.success("Client renamed successfully");
      } catch (error) {
        toast.error("Failed to rename client: " + error.message);
      } finally {
        setIsRenaming(false);
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
      {/* <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 cursor-pointer">
        Marketing
      </span> */}
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
        onClick={handleRename}
        disabled={isRenaming}
        className={`inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-600/10 cursor-pointer ${
          isRenaming ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isRenaming ? "Renaming..." : "Rename"}
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

// Modal Component for Adding New Client
const AddClientModal = ({ isOpen, onClose, onSubmit, isLoading, phone_number_id, wba_id }) => {
  const [waId, setWaId] = useState("");
  const [clientName, setClientName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!waId.trim()) {
      toast.error("Please enter a WhatsApp number");
      return;
    }

    // Validate wa_id format (should be numeric, typically 10-14 digits)
    if (!/^\d{10,15}$/.test(waId.trim())) {
      toast.error("Please enter a valid WhatsApp number (10-15 digits)");
      return;
    }

    try {
      await onSubmit(waId.trim(), clientName.trim() || waId.trim());
      setWaId("");
      setClientName("");
      onClose();
      toast.success("Client added successfully!");
      
      // Optionally open the chat window directly
      setTimeout(() => {
        const absolutePath =
          window.location.origin +
          window.location.pathname +
          `#/whatsapp/chat/${wba_id}/${phone_number_id}/${waId.trim()}?profileName=${clientName.trim() || waId.trim()}`;
        window.open(
          absolutePath,
          `${phone_number_id}-${waId.trim()}`,
          "width=400,height=500"
        );
      }, 500);
    } catch (error) {
      toast.error(error.message || "Failed to add client");
    }
  };

  const handleClose = () => {
    setWaId("");
    setClientName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Add New Client</h2>
          <button
            onClick={handleClose}
            className="text-gray-100 hover:text-gray-700 text-2xl"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Number *
            </label>
            <input
              type="text"
              value={waId}
              onChange={(e) => setWaId(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g., 919876543210"
              className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              disabled={isLoading}
              maxLength="15"
            />
            <p className="text-xs text-gray-500 mt-1">Enter 10-15 digit WhatsApp number without +</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name (Optional)
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">If not provided, phone number will be used as name</p>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-100 hover:text-gray-500 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ImSpinner11 className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <IoAddCircle className="text-lg" />
                  Add Client
                </>
              )}
            </button>
          </div>
        </form>
      </div>
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);

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
      await fetchBusinesses();
    } catch (error) {
      throw error;
    }
  }, [phone_number_id, fetchBusinesses]);

  const handleRenameClient = useCallback(async (wa_id, newName) => {
    try {
      await businessService.renameClient(phone_number_id, wa_id, newName);
      await fetchBusinesses();
    } catch (error) {
      throw error;
    }
  }, [phone_number_id, fetchBusinesses]);

  const handleAddClient = useCallback(async (wa_id, clientName) => {
    try {
      setIsAddingClient(true);
      await businessService.addClient(phone_number_id, wa_id, clientName, wba_id);
      await fetchBusinesses();
    } catch (error) {
      throw error;
    } finally {
      setIsAddingClient(false);
    }
  }, [phone_number_id, wba_id, fetchBusinesses]);

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
            onRename={handleRenameClient}
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
        <div className="flex gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer flex items-center gap-2 transition"
          >
            <IoAddCircle className="text-lg" />
            Add Number
          </button>
          <div
            onClick={() => fetchBusinesses()}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded cursor-pointer transition"
          >
            <ImSpinner11 />
          </div>
        </div>
      </div>

      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddClient}
        isLoading={isAddingClient}
        phone_number_id={phone_number_id}
        wba_id={wba_id}
      />
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
          className="px-4 py-2 text-amber-50 bg-gray-300 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {pageIndex + 1} of {pageOptions.length}
        </span>
        <button
          onClick={nextPage}
          disabled={!canNextPage}
          className="px-4 py-2 text-amber-50 bg-gray-300 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default WBAClientTable;
