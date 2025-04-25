/**
 * Tests for the Tokenizer utility
 */

import { Tokenizer, MODEL_TOKEN_LIMITS } from "../../src/llm/Tokenizer";

describe("Tokenizer", () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer();
  });

  describe("countTokens", () => {
    test("should count tokens for an empty string", () => {
      const result = tokenizer.countTokens("");
      expect(result).toBe(0);
    });

    test("should count tokens for a short text", () => {
      const result = tokenizer.countTokens("Hello, world!");
      expect(result).toBeGreaterThan(0);
    });

    test("should count more tokens for longer text", () => {
      const shortText = "Hello";
      const longText =
        "Hello, this is a much longer text that should have more tokens than the short text.";

      const shortTokens = tokenizer.countTokens(shortText);
      const longTokens = tokenizer.countTokens(longText);

      expect(longTokens).toBeGreaterThan(shortTokens);
    });
  });

  describe("fitsInContext", () => {
    test("should return true for text under token limit", () => {
      // Mock the countTokens method to return a fixed value
      jest.spyOn(tokenizer, "countTokens").mockReturnValue(100);

      const result = tokenizer.fitsInContext("Short text", "gpt-3.5-turbo");
      expect(result).toBe(true);
    });

    test("should return false for text over token limit", () => {
      // Mock the countTokens method to return a value larger than the model limit
      const modelName = "gpt-3.5-turbo";
      const limit = MODEL_TOKEN_LIMITS[modelName];
      jest.spyOn(tokenizer, "countTokens").mockReturnValue(limit + 1);

      const result = tokenizer.fitsInContext("Very long text", modelName);
      expect(result).toBe(false);
    });

    test("should use default limit for unknown model", () => {
      // Mock the countTokens method
      jest.spyOn(tokenizer, "countTokens").mockReturnValue(5000);

      const result = tokenizer.fitsInContext("Some text", "unknown-model");
      expect(result).toBe(false); // Default is 4096
    });
  });

  describe("getRemainingTokens", () => {
    test("should calculate remaining tokens correctly", () => {
      const model = "gpt-3.5-turbo";
      const limit = MODEL_TOKEN_LIMITS[model];
      const usedTokens = 1000;

      const result = tokenizer.getRemainingTokens(usedTokens, model);
      expect(result).toBe(limit - usedTokens);
    });

    test("should return 0 if used tokens exceed limit", () => {
      const model = "gpt-3.5-turbo";
      const limit = MODEL_TOKEN_LIMITS[model];
      const usedTokens = limit + 100;

      const result = tokenizer.getRemainingTokens(usedTokens, model);
      expect(result).toBe(0);
    });
  });

  describe("truncateToFit", () => {
    test("should not modify text that already fits", () => {
      const text = "Short text";
      jest
        .spyOn(tokenizer, "countTokens")
        .mockReturnValueOnce(5) // First call for the check
        .mockReturnValueOnce(5); // Second call wouldn't happen but added for safety

      const result = tokenizer.truncateToFit(text, 10);
      expect(result).toBe(text);
    });

    test("should truncate text to fit within token limit", () => {
      const text = "This is a longer text that needs to be truncated";

      // Mock countTokens to return values that will cause truncation
      const countTokensMock = jest.spyOn(tokenizer, "countTokens");
      countTokensMock.mockReturnValueOnce(20); // First check - over limit
      countTokensMock.mockReturnValueOnce(12); // Still over after first truncation
      countTokensMock.mockReturnValueOnce(8); // Under limit after second truncation

      const result = tokenizer.truncateToFit(text, 10);
      expect(result.length).toBeLessThan(text.length);
      expect(countTokensMock).toHaveBeenCalledTimes(3);
    });
  });
});
