/**
 * OpenAIClient - OpenAI-specific implementation of LLMClient
 *
 * Handles OpenAI API authentication, request formatting, and response parsing.
 */

import axios from "axios";
import { LLMClient, LLMRequest, LLMResponse } from "../LLMClient";
import { logger } from "../../utils/logger";

// OpenAI API endpoints
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface OpenAICompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIClient extends LLMClient {
  constructor(apiKey: string) {
    super(apiKey);
  }

  /**
   * Make a request to the OpenAI API
   */
  protected async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    const { prompt, model, temperature = 0.7, maxTokens } = request;

    // Format messages for the OpenAI Chat API
    const messages: OpenAIMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    // Format the OpenAI-specific request
    const openAIRequest: OpenAIRequest = {
      model,
      messages,
    };

    // Only set temperature for models that support it
    // o4-mini only supports the default temperature of 1
    if (!model.includes("o4-mini")) {
      openAIRequest.temperature = temperature;
    }

    if (maxTokens) {
      openAIRequest.max_tokens = maxTokens;
    }

    try {
      // Make the API request
      const response = await axios.post<OpenAICompletion>(
        OPENAI_API_URL,
        openAIRequest,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const { data } = response;

      // Extract the response content
      const content = data.choices[0].message.content;

      // Format the response
      return {
        content,
        tokenUsage: {
          prompt: data.usage.prompt_tokens,
          completion: data.usage.completion_tokens,
          total: data.usage.total_tokens,
        },
        model: data.model,
        id: data.id,
      };
    } catch (error: any) {
      // Handle API errors
      if (error.response) {
        const { status, data } = error.response;
        logger.error(`OpenAI API error (${status}): ${JSON.stringify(data)}`);

        // Handle rate limiting specifically
        if (status === 429) {
          throw new Error(
            "OpenAI API rate limit exceeded. Retry after a short delay."
          );
        }
      }

      throw error;
    }
  }
}
