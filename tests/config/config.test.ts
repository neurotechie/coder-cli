// Tests for the configuration module
import { loadConfig, Config } from '../../config';

// Mock dotenv to not load actual .env file during tests
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Config Module', () => {
  // Store original process.env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore process.env after all tests
    process.env = originalEnv;
  });

  test('should use default values when no environment variables or CLI args are provided', () => {
    const config = loadConfig();
    
    // Check that default values are used
    expect(config.llmApiKey).toBe('');
    expect(config.llmModel).toBe('gpt-4');
    expect(config.rateLimitBaseDelay).toBe(1000);
    expect(config.rateLimitMaxRetries).toBe(5);
    expect(config.fileChunkSize).toBe(1000);
    expect(config.maxIterations).toBe(10);
    expect(config.confirmActions).toBe(false);
  });

  test('should use environment variables when provided', () => {
    // Set environment variables
    process.env.LLM_API_KEY = 'test-api-key';
    process.env.LLM_MODEL = 'test-model';
    process.env.RATE_LIMIT_BASE_DELAY = '2000';
    process.env.RATE_LIMIT_MAX_RETRIES = '3';
    process.env.FILE_CHUNK_SIZE = '500';
    process.env.MAX_ITERATIONS = '15';
    process.env.CONFIRM_ACTIONS = 'true';
    
    const config = loadConfig();
    
    // Check that environment variables are used
    expect(config.llmApiKey).toBe('test-api-key');
    expect(config.llmModel).toBe('test-model');
    expect(config.rateLimitBaseDelay).toBe(2000);
    expect(config.rateLimitMaxRetries).toBe(3);
    expect(config.fileChunkSize).toBe(500);
    expect(config.maxIterations).toBe(15);
    expect(config.confirmActions).toBe(true);
  });

  test('should use CLI arguments when provided, overriding environment variables', () => {
    // Set environment variables
    process.env.LLM_API_KEY = 'env-api-key';
    process.env.LLM_MODEL = 'env-model';
    
    // Provide CLI arguments
    const cliArgs = {
      llmApiKey: 'cli-api-key',
      llmModel: 'cli-model',
      rateLimitBaseDelay: 3000,
      rateLimitMaxRetries: 4,
      fileChunkSize: 750,
      maxIterations: 20,
      confirmActions: true
    };
    
    const config = loadConfig(cliArgs);
    
    // Check that CLI arguments override environment variables
    expect(config.llmApiKey).toBe('cli-api-key');
    expect(config.llmModel).toBe('cli-model');
    expect(config.rateLimitBaseDelay).toBe(3000);
    expect(config.rateLimitMaxRetries).toBe(4);
    expect(config.fileChunkSize).toBe(750);
    expect(config.maxIterations).toBe(20);
    expect(config.confirmActions).toBe(true);
  });

  test('should handle boolean confirmActions correctly', () => {
    // Test with string 'false'
    process.env.CONFIRM_ACTIONS = 'false';
    let config = loadConfig();
    expect(config.confirmActions).toBe(false);
    
    // Test with string 'true'
    process.env.CONFIRM_ACTIONS = 'true';
    config = loadConfig();
    expect(config.confirmActions).toBe(true);
    
    // CLI arg should override env var
    config = loadConfig({ confirmActions: false });
    expect(config.confirmActions).toBe(false);
  });
});
