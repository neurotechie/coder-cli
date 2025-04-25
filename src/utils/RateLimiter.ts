// Rate limiter with exponential backoff and jitter for API requests
import { logger } from './logger';

/**
 * Implements exponential backoff with jitter for API rate limiting
 */
export class RateLimiter {
  private baseDelay: number;
  private maxRetries: number;

  /**
   * Create a new RateLimiter
   * @param baseDelay - Base delay in milliseconds
   * @param maxRetries - Maximum number of retries
   */
  constructor(baseDelay: number = 1000, maxRetries: number = 5) {
    this.baseDelay = baseDelay;
    this.maxRetries = maxRetries;
  }

  /**
   * Executes a function with exponential backoff retry logic
   * @param fn - The async function to execute
   * @param context - Optional description for logging
   * @returns The result of the function
   * @throws The last error encountered after max retries
   */
  async execute<T>(fn: () => Promise<T>, context: string = 'API call'): Promise<T> {
    let retries = 0;
    let lastError: Error | null = null;

    while (retries <= this.maxRetries) {
      try {
        // Attempt to execute the function
        return await fn();
      } catch (error: any) {
        lastError = error;
        retries++;

        // Check if we've exceeded max retries
        if (retries > this.maxRetries) {
          logger.error(`${context}: Max retries (${this.maxRetries}) exceeded`);
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(retries);
        
        logger.system(`${context}: Rate limit encountered. Retrying in ${delay}ms (attempt ${retries}/${this.maxRetries})`);
        
        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached due to the throw in the loop,
    // but TypeScript needs it for type safety
    throw lastError;
  }

  /**
   * Calculate delay using exponential backoff with jitter
   * @param retryCount - Current retry count
   * @returns Delay in milliseconds
   */
  private calculateDelay(retryCount: number): number {
    // Exponential backoff: baseDelay * 2^retryCount
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount - 1);
    
    // Add jitter: random value between 0 and exponentialDelay * 0.5
    const jitter = Math.random() * exponentialDelay * 0.5;
    
    return exponentialDelay + jitter;
  }

  /**
   * Sleep for the specified duration
   * @param ms - Milliseconds to sleep
   * @returns A promise that resolves after the specified delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
