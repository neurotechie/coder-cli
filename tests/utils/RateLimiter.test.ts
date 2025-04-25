// Tests for the RateLimiter utility
import { RateLimiter } from "../../src/utils/RateLimiter";

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    // Use fake timers for all tests
    jest.useFakeTimers();
    rateLimiter = new RateLimiter(100, 3); // Small values for testing
    jest.clearAllMocks();

    // Silence console logging to avoid noise in test output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up fake timers and mocks after each test
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("should execute function successfully on first try", async () => {
    const mockFn = jest.fn().mockResolvedValue("success");

    const result = await rateLimiter.execute(mockFn);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result).toBe("success");
  });

  test("should retry on failure and succeed eventually", async () => {
    // Mock function that fails twice then succeeds
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Rate limit"))
      .mockRejectedValueOnce(new Error("Rate limit"))
      .mockResolvedValue("success after retry");

    // Mock sleep to make tests faster
    jest.spyOn(rateLimiter as any, "sleep").mockResolvedValue(undefined);

    const result = await rateLimiter.execute(mockFn);

    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(result).toBe("success after retry");
  });

  test("should throw error after max retries", async () => {
    // Mock function that always fails
    const mockFn = jest
      .fn()
      .mockRejectedValue(new Error("Rate limit exceeded"));

    // Mock sleep to make tests faster
    jest.spyOn(rateLimiter as any, "sleep").mockResolvedValue(undefined);

    try {
      await rateLimiter.execute(mockFn);
      // If we get here, the test should fail
      fail("Expected an error to be thrown");
    } catch (error) {
      // This is the expected path
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Rate limit exceeded");
    }

    expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  test("should use exponential backoff", async () => {
    // Spy on the calculateDelay method
    const calculateDelaySpy = jest.spyOn(rateLimiter as any, "calculateDelay");

    // Mock sleep to make tests faster
    jest.spyOn(rateLimiter as any, "sleep").mockResolvedValue(undefined);

    // Mock function that always fails
    const mockFn = jest.fn().mockRejectedValue(new Error("Rate limit"));

    try {
      await rateLimiter.execute(mockFn);
    } catch (error) {
      // Expected to fail after max retries
    }

    // Check that calculateDelay was called with increasing retry counts
    expect(calculateDelaySpy).toHaveBeenCalledTimes(3);
    expect(calculateDelaySpy).toHaveBeenNthCalledWith(1, 1);
    expect(calculateDelaySpy).toHaveBeenNthCalledWith(2, 2);
    expect(calculateDelaySpy).toHaveBeenNthCalledWith(3, 3);
  });
});
