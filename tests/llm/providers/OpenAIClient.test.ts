/**
 * Tests for the OpenAIClient implementation of LLMClient
 */

import axios from "axios";
import { OpenAIClient } from "../../../src/llm/providers/OpenAIClient";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("OpenAIClient", () => {
  let openAIClient: OpenAIClient;
  const apiKey = "test-api-key";

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a new instance for each test
    openAIClient = new OpenAIClient(apiKey);
  });

  describe("makeRequest", () => {
    test("should format the OpenAI-specific request properly", async () => {
      // Setup axios mock response
      const mockResponse = {
        data: {
          id: "test-id",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-3.5-turbo",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "This is a test response",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Call the method
      const request = {
        prompt: "Test prompt",
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        maxTokens: 100,
      };

      // Access the protected method for testing
      const result = await (openAIClient as any).makeRequest(request);

      // Verify the result format
      expect(result).toEqual({
        content: "This is a test response",
        tokenUsage: {
          prompt: 10,
          completion: 5,
          total: 15,
        },
        model: "gpt-3.5-turbo",
        id: "test-id",
      });

      // Verify the axios call
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: "Test prompt",
            },
          ],
          temperature: 0.5,
          max_tokens: 100,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
    });

    test("should handle API errors properly", async () => {
      // Setup axios mock to throw an error
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              message: "Invalid request",
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(errorResponse);

      // Call the method
      const request = {
        prompt: "Test prompt",
        model: "gpt-3.5-turbo",
      };

      // Access the protected method for testing and expect it to throw
      await expect(
        (openAIClient as any).makeRequest(request)
      ).rejects.toThrow();
    });

    test("should handle rate limit errors specifically", async () => {
      // Setup axios mock to throw a rate limit error
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            error: {
              message: "Rate limit exceeded",
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(rateLimitError);

      // Call the method
      const request = {
        prompt: "Test prompt",
        model: "gpt-3.5-turbo",
      };

      // Access the protected method for testing and expect it to throw with specific message
      await expect((openAIClient as any).makeRequest(request)).rejects.toThrow(
        "OpenAI API rate limit exceeded"
      );
    });

    test("should not include temperature for o4-mini model", async () => {
      // Setup axios mock response
      const mockResponse = {
        data: {
          id: "test-id",
          object: "chat.completion",
          created: Date.now(),
          model: "o4-mini",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "This is a test response",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Call the method
      const request = {
        prompt: "Test prompt",
        model: "o4-mini",
        temperature: 0.7, // This should be ignored for o4-mini
        maxTokens: 100,
      };

      // Access the protected method for testing
      const result = await (openAIClient as any).makeRequest(request);

      // Verify the result format
      expect(result).toEqual({
        content: "This is a test response",
        tokenUsage: {
          prompt: 10,
          completion: 5,
          total: 15,
        },
        model: "o4-mini",
        id: "test-id",
      });

      // Verify the axios call - temperature should NOT be included
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "o4-mini",
          messages: [
            {
              role: "user",
              content: "Test prompt",
            },
          ],
          max_tokens: 100,
          // temperature should not be present
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      // Specifically check that temperature is not included
      const requestBody = mockedAxios.post.mock.calls[0][1];
      expect(requestBody).not.toHaveProperty("temperature");
    });
  });
});
