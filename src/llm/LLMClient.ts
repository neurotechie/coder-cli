/**
 * LLMClient - Abstract base class for LLM API interactions
 *
 * Provides common functionality for sending prompts to LLMs and
 * handling responses with rate limiting.
 */

import { logger } from "../utils/logger";
import { RateLimiter } from "../utils/RateLimiter";
import { Tokenizer } from "./Tokenizer";

// Types for LLM requests and responses
export interface LLMRequest {
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any; // Allow additional provider-specific parameters
}

export interface LLMResponse {
  content: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  [key: string]: any; // Allow additional provider-specific response fields
}

export abstract class LLMClient {
  protected apiKey: string;
  protected rateLimiter: RateLimiter;
  protected tokenizer: Tokenizer;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter();
    this.tokenizer = new Tokenizer();

    if (!apiKey) {
      throw new Error("API key is required for LLMClient");
    }
  }

  /**
   * Send a prompt to the LLM and get a response
   * This method handles rate limiting and common error handling
   */
  public async sendPrompt(request: LLMRequest): Promise<LLMResponse> {
    const { prompt, model } = request;

    logger.system(`Sending prompt to LLM model: ${model}`);
    logger.system(
      `Estimated token count: ${this.tokenizer.countTokens(prompt)}`
    );

    try {
      // Use rate limiter to handle potential API rate limits
      return await this.rateLimiter.execute(async () => {
        return this.makeRequest(request);
      });
    } catch (error: any) {
      logger.error(`LLM API error: ${error.message}`);
      throw new Error(`Failed to get response from LLM: ${error.message}`);
    }
  }

  /**
   * Make the actual API request - to be implemented by provider-specific subclasses
   */
  protected abstract makeRequest(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Parse JSON from LLM response
   * Useful for extracting structured data from LLM responses
   */
  public parseJSON<T>(text: string): T {
    try {
      // Handle potential issues like markdown code blocks
      let jsonText = text;

      // Remove markdown code block wrapping if present
      if (text.includes("```json")) {
        jsonText = text.split("```json")[1].split("```")[0].trim();
      } else if (text.includes("```")) {
        jsonText = text.split("```")[1].split("```")[0].trim();
      }

      return JSON.parse(jsonText) as T;
    } catch (error: any) {
      logger.error(`Failed to parse JSON from LLM response: ${error.message}`);
      throw new Error(`Invalid JSON in LLM response: ${error.message}`);
    }
  }
}
