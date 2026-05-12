export const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Previous
    </button>
    
    <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
      </span>
    </div>
    
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
    >
      Next
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
);
