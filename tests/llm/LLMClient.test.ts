/**
 * Tests for the LLMClient abstract base class
 */

import { LLMClient, LLMRequest, LLMResponse } from "../../src/llm/LLMClient";
import { RateLimiter } from "../../src/utils/RateLimiter";

// Create a concrete implementation of the abstract class for testing
class TestLLMClient extends LLMClient {
  public lastRequest: LLMRequest | null = null;

  constructor(apiKey: string = "test-api-key") {
    super(apiKey);
  }

  protected async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    this.lastRequest = request;
    return {
      content: "This is a test response",
      tokenUsage: {
        prompt: 10,
        completion: 5,
        total: 15,
      },
    };
  }
}

// Mock the RateLimiter
jest.mock("../../src/utils/RateLimiter");

describe("LLMClient", () => {
  let llmClient: TestLLMClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a new instance for each test
    llmClient = new TestLLMClient();

    // Setup RateLimiter mock
    (RateLimiter as jest.Mock).mockImplementation(() => ({
      execute: jest.fn((fn) => fn()),
    }));
  });

  describe("constructor", () => {
    test("should throw an error if API key is not provided", () => {
      expect(() => new TestLLMClient("")).toThrow("API key is required");
    });

    test("should create a tokenizer instance", () => {
      expect(llmClient["tokenizer"]).toBeDefined();
    });

    test("should create a rate limiter instance", () => {
      expect(llmClient["rateLimiter"]).toBeDefined();
    });
  });

  describe("sendPrompt", () => {
    test("should call makeRequest with the provided request", async () => {
      const request: LLMRequest = {
        prompt: "Test prompt",
        model: "test-model",
      };

      const spy = jest.spyOn(llmClient as any, "makeRequest");
      await llmClient.sendPrompt(request);

      expect(spy).toHaveBeenCalledWith(request);
    });

    test("should use rate limiter for API calls", async () => {
      const request: LLMRequest = {
        prompt: "Test prompt",
        model: "test-model",
      };

      await llmClient.sendPrompt(request);

      // Check that the rateLimiter's execute method was called
      expect(llmClient["rateLimiter"].execute).toHaveBeenCalled();
    });

    test("should handle API errors gracefully", async () => {
      const request: LLMRequest = {
        prompt: "Test prompt",
        model: "test-model",
      };

      // Make the makeRequest method throw an error
      jest
        .spyOn(llmClient as any, "makeRequest")
        .mockRejectedValue(new Error("API error"));

      await expect(llmClient.sendPrompt(request)).rejects.toThrow(
        "Failed to get response from LLM"
      );
    });
  });

  describe("parseJSON", () => {
    test("should parse valid JSON", () => {
      const json = '{"key": "value"}';
      const result = llmClient.parseJSON(json);
      expect(result).toEqual({ key: "value" });
    });

    test("should handle JSON inside markdown code blocks", () => {
      const markdownJson = '```json\n{"key": "value"}\n```';
      const result = llmClient.parseJSON(markdownJson);
      expect(result).toEqual({ key: "value" });
    });

    test("should handle JSON inside general code blocks", () => {
      const codeBlockJson = '```\n{"key": "value"}\n```';
      const result = llmClient.parseJSON(codeBlockJson);
      expect(result).toEqual({ key: "value" });
    });

    test("should throw an error for invalid JSON", () => {
      const invalidJson = '{"key": value}'; // Missing quotes around value
      expect(() => llmClient.parseJSON(invalidJson)).toThrow(
        "Invalid JSON in LLM response"
      );
    });
  });
});
