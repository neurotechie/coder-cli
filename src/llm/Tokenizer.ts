/**
 * Tokenizer - Utility for counting tokens and managing context window
 *
 * Provides functions for estimating token counts for different LLM models
 * and helpers for context window management.
 */

import GPT3Tokenizer from "gpt-3-encoder"; // You may need to install this package

// Token limits for different models
export const MODEL_TOKEN_LIMITS: Record<string, number> = {
  "gpt-3.5-turbo": 4096,
  "gpt-3.5-turbo-16k": 16384,
  "gpt-4": 8192,
  "gpt-4-32k": 32768,
  "gpt-4-turbo": 128000,
  // Add other models as needed
};

export class Tokenizer {
  /**
   * Count tokens in a string for a specific model
   */
  public countTokens(text: string): number {
    // Use GPT-3 Encoder for estimating tokens
    // This is an approximation and may differ slightly from the actual tokenization
    return GPT3Tokenizer.encode(text).length;
  }

  /**
   * Check if text fits within token limit
   */
  public fitsInContext(text: string, model: string): boolean {
    const limit = MODEL_TOKEN_LIMITS[model] || 4096; // Default to 4096 if model not found
    const tokenCount = this.countTokens(text);
    return tokenCount <= limit;
  }

  /**
   * Get remaining tokens in context window
   */
  public getRemainingTokens(usedTokens: number, model: string): number {
    const limit = MODEL_TOKEN_LIMITS[model] || 4096;
    return Math.max(0, limit - usedTokens);
  }

  /**
   * Truncate text to fit within token limit
   */
  public truncateToFit(text: string, maxTokens: number): string {
    if (this.countTokens(text) <= maxTokens) {
      return text; // Already fits
    }

    // Simple truncation strategy - could be improved for smarter truncation
    let truncated = text;
    while (this.countTokens(truncated) > maxTokens && truncated.length > 0) {
      truncated = truncated.slice(0, truncated.length - 100); // Remove 100 chars at a time
    }

    return truncated;
  }
}
