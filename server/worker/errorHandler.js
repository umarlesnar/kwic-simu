class MessageProcessingError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = "MessageProcessingError";
    this.originalError = originalError;
  }
}

const handleError = (error, context) => {
  console.error(`Error in ${context}:`, error);
  // Add additional error handling logic (e.g., metrics, alerts)
};

module.exports = { MessageProcessingError, handleError };
