export const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex justify-center gap-2">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className="px-4 py-2 border rounded-lg disabled:opacity-50"
    >
      Previous
    </button>
    <span className="px-4 py-2">
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className="px-4 py-2 border rounded-lg disabled:opacity-50"
    >
      Next
    </button>
  </div>
);
