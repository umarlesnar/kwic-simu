export const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-40">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400"></div>
      <p className="text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
    </div>
  </div>
);
