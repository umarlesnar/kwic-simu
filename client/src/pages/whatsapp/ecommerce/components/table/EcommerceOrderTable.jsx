import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTable, usePagination, useSortBy } from "react-table";
import { toast } from "react-toastify";
import { businessService } from "@api/businessService";
import { SearchBar } from "@common/SearchBar";
import { LoadingSpinner } from "@common/LoadingSpinner";
import { ImSpinner11 } from "react-icons/im";
import { WebhookService } from "@api/WebhookService";
import WbMessageStatus from "@utils/WBMessageStatus";

const ActionButtonGroup = ({ message, handleBtnNavigation }) => {
  return (
    <div className="flex gap-2">
      <span onClick={() => handleBtnNavigation(message, "sent")} className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-700/10 cursor-pointer">SENT</span>
      <span onClick={() => handleBtnNavigation(message, "delivered")} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 cursor-pointer">DELIVERED</span>
      <span onClick={() => handleBtnNavigation(message, "read")} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 cursor-pointer">READ</span>
    </div>
  );
};

const ErrorActions = () => (
  <div className="flex gap-2 text-sm text-red-700">
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-700/10 cursor-pointer">Re-engagement</span>
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-700/10 cursor-pointer">User experiment</span>
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-700/10 cursor-pointer">Undeliverable</span>
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-700/10 cursor-pointer">Ecosystem engagement</span>
  </div>
);

const EcommerceOrderMessageTable = ({ wba_id, phone_number_id }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState({});

  const pageSize = 10;

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await businessService.getAllMessages(phone_number_id, 1, pageSize);
      setBusinesses(response.data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [phone_number_id]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const filteredBusinesses = useMemo(() =>
    businesses.filter((b) => b.to?.toLowerCase().includes(searchTerm.toLowerCase())),
    [businesses, searchTerm]
  );

  const handleCheckboxChange = (id) => {
    setSelectedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.keys(selectedRows).length === filteredBusinesses.length;
    if (allSelected) {
      setSelectedRows({});
    } else {
      const newSelection = {};
      filteredBusinesses.forEach((b) => {
        newSelection[b.id] = true;
      });
      setSelectedRows(newSelection);
    }
  };

  const handleBtnNavigation = async (message, type) => {
    try {
      const webhook_payload = new WbMessageStatus(
        message.to.replace(/\s+/g, ""),
        phone_number_id,
        wba_id
      );
      webhook_payload.type = type;
      webhook_payload.messageId = message.id;
      webhook_payload.wa_id = message.to;
      webhook_payload.conversation =
        typeof message.conversation === "string"
          ? JSON.parse(message.conversation)
          : message.conversation;
      await WebhookService.push(webhook_payload.getObject());
      
      // Refresh data after status change
      await fetchBusinesses();
    } catch (error) {
      // toast.error("Failed to update message status!");
    }
  };

  const columns = useMemo(() => [
    {
      Header: (
        <input
          type="checkbox"
          checked={Object.keys(selectedRows).length === filteredBusinesses.length && filteredBusinesses.length > 0}
          onChange={handleSelectAll}
        />
      ),
      accessor: "id",
      disableSortBy: true,
      Cell: ({ row }) => (
        <input
          type="checkbox"
          checked={!!selectedRows[row.original.id]}
          onChange={() => handleCheckboxChange(row.original.id)}
        />
      ),
    },
    { Header: "Id", accessor: (_, i) => i + 1 },
    { Header: "Wa Id", accessor: "to" },
    { Header: "Type", accessor: "type" },
    { Header: "DATETIME", accessor: "created_at" },
    {
      Header: "SUCCESS",
      Cell: ({ row }) => (
        <ActionButtonGroup message={row.original} handleBtnNavigation={handleBtnNavigation} />
      ),
    },
    { Header: "ERRORS", Cell: () => <ErrorActions /> },
  ], [wba_id, phone_number_id, selectedRows, filteredBusinesses]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    state: { pageIndex },
  } = useTable(
    {
      columns,
      data: filteredBusinesses,
      initialState: { pageIndex: 0, pageSize },
    },
    useSortBy,
    usePagination
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="container mx-auto p-6 text-sm">
      <div className="mb-6 flex justify-between items-center">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search messages..." />
        <div onClick={() => fetchBusinesses()} className="bg-green-500 text-white px-4 py-2 rounded cursor-pointer">
          <ImSpinner11 />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table {...getTableProps()} className="min-w-full bg-white">
          <thead className="bg-gray-50">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.disableSortBy ? '' : 'cursor-pointer hover:bg-gray-100'}`}>
                    {column.render("Header")}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200 text-black">
            {page.map(row => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} className="hover:bg-gray-50 text-left">
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()} className="px-3 py-2 whitespace-nowrap">
                      {cell.render("Cell")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EcommerceOrderMessageTable;
