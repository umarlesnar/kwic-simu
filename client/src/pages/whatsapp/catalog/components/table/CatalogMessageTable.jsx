import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useTable, usePagination, useSortBy } from "react-table";
import { toast } from "react-toastify";
import { businessService } from "@api/businessService";
import { SearchBar } from "@common/SearchBar";
import { LoadingSpinner } from "@common/LoadingSpinner";
import { ImSpinner11 } from "react-icons/im";


const CatalogProductTable = ({ wba_id, catalog_id }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await businessService.getAllProducts(
        catalog_id,
        currentPage,
        10
      );
      // Handle the response structure from backend
      const products = response.data || response || [];
      setBusinesses(Array.isArray(products) ? products : []);
      setTotalPages(response.totalPages || response.paging?.total_pages || 1);
    } catch (err) {
      console.error('Error fetching products:', err);
      setBusinesses([]);
      setError(`API Error: ${err.message}`);
      toast.error(`API Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [catalog_id, currentPage]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const filteredBusinesses = useMemo(
    () =>
      businesses.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [businesses, searchTerm]
  );

  const columns = useMemo(
    () => [
      { Header: "#", accessor: (row, i) => i + 1 + (currentPage - 1) * 10 },
      {
        Header: "Image",
        accessor: "image_url",
        Cell: ({ value }) => (
          <img src={value} alt="product" className="w-12 h-12 object-cover" />
        ),
      },
      { Header: "Product ID", accessor: "id" },
      { Header: "Retailer ID", accessor: "retailer_id" },
      { Header: "Name", accessor: "name" },
      { Header: "Title", accessor: "title" },
      { Header: "Brand", accessor: "brand" },
      { Header: "Availability", accessor: "availability" },
      { Header: "Price", accessor: "price" },
      { Header: "Condition", accessor: "condition" },
    ],

    [currentPage]
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
  
  if (!loading && businesses.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search catalog..."
          />
          <div
            onClick={() => fetchBusinesses()}
            className="bg-green-500 text-white px-4 py-2 rounded cursor-pointer"
          >
            <ImSpinner11 />
          </div>
        </div>
        <div className="text-center p-8 text-gray-500">
          <p>No products found for catalog_id: {catalog_id}</p>
          <p>Check the browser console for API response details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search catalog..."
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

export default CatalogProductTable;
