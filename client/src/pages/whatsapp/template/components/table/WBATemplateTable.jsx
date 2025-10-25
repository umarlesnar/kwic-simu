import React, { useState, useCallback, useEffect } from "react";
import { useTable, useSortBy, useGlobalFilter } from "react-table";
import { toast } from "react-toastify";
import { businessService } from "@api/businessService";
import { SearchBar } from "@common/SearchBar";
import { LoadingSpinner } from "@common/LoadingSpinner";
import { ImSpinner11 } from "react-icons/im";
import { WebhookService } from "@api/WebhookService";
import WBTemplateStatus from "@utils/WBTemplateStatus";


const ActionButtonGroup = ({ template, wba_id }) => {
  const handleBtnNavigation = useCallback(
    async (type) => {
      const webhook_payload = new WBTemplateStatus(wba_id);
      webhook_payload.type = type;
      webhook_payload.message_template_id = template.id;
      webhook_payload.message_template_name = template.data.name;
      webhook_payload.message_template_language = template.data.language;
      await WebhookService.push(webhook_payload.getObject());
    },
    [wba_id, template]
  );

  return (
    <div className="mt-1 flex justify-start gap-2">
      {["PENDING_DELETION", "PAUSED", "REJECTED", "APPROVED", "DISABLED"].map((status) => (
        <span
          key={status}
          onClick={() => handleBtnNavigation(status)}
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium cursor-pointer ${
            status === "APPROVED"
              ? "bg-green-50 text-green-700 ring-green-600/20"
              : "bg-blue-50 text-blue-700 ring-blue-700/10"
          }`}
        >
          {status}
        </span>
      ))}
    </div>
  );
};

                        
const QualityButtonGroup = ({ template, wba_id }) => {
  const handleBtnNavigation = useCallback(
    async (type) => {
      const webhook_payload = new WBTemplateStatus(wba_id);
      webhook_payload.type = type;
      webhook_payload.message_template_id = template.id;
      webhook_payload.message_template_name = template.data.name;
      webhook_payload.message_template_language = template.data.language;
      await WebhookService.push(webhook_payload.getStatusObject());
    },
    [wba_id, template]
  );

  return (
    <div className="mt-1 flex justify-start gap-2">
      {["UNKNOWN", "YELLOW", "GREEN", "RED"].map((status) => (
        <span
          key={status}
          onClick={() => handleBtnNavigation(status)}
          className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset cursor-pointer"
        >
          {status}
        </span>
      ))}
    </div>
  );
};

const WBATemplateTable = ({ wba_id }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await businessService.getAllTemplates(wba_id, currentPage, 10);
      setTemplates(response.data);
      setTotalPages(response.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [wba_id, currentPage]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

 
  const columns = React.useMemo(
    () => [
      { Header: "Id", accessor: "id" },
      { Header: "Name", accessor: "data.name" },
      { Header: "Category", accessor: "category" },
      { Header: "Status", Cell: ({ row }) => <ActionButtonGroup template={row.original} wba_id={wba_id} /> },
      { Header: "Quality", Cell: ({ row }) => <QualityButtonGroup template={row.original} wba_id={wba_id} /> },
    ],
    [wba_id]
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    { columns, data: templates },
    useGlobalFilter,
    useSortBy
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="container mx-auto p-6">

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchBar value={searchTerm} onChange={handleSearch} placeholder="Search template..." />
        <div onClick={() => fetchTemplates()} className="cursor-pointer bg-green-500 text-white px-4 py-2 rounded">
          <ImSpinner11 />
        </div>
      </div>

      
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table {...getTableProps()} className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                    {column.render("Header")}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200 text-black">
            {rows.map((row) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} className="hover:bg-gray-50">
                  {row.cells.map((cell) => (
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

     
      <div className="flex justify-between mt-4">
        <button onClick={previousPage} disabled={currentPage <= 1} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={nextPage} disabled={currentPage >= totalPages} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">
          Next
        </button>
      </div>
    </div>
  );
};

export default WBATemplateTable;
