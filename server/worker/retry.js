class RetryConfig {
  constructor(maxAttempts = 3, baseDelay = 1000, maxDelay = 10000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }
}

function calculateBackoff(attempt, baseDelay, maxDelay) {
  const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return exponentialDelay + jitter;
}

async function withRetry(operation, config = new RetryConfig()) {
  let lastError;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < config.maxAttempts - 1) {
        const delay = calculateBackoff(
          attempt,
          config.baseDelay,
          config.maxDelay
        );
        console.log(
          `Retry attempt ${attempt + 1}/${config.maxAttempts} after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

module.exports = { RetryConfig, withRetry };
