// Configuration loader for the application
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Find the package root directory and load environment variables from .env file
const packageRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(packageRoot, ".env") });

interface Config {
  // LLM Configuration
  llmApiKey: string;
  llmModel: string;

  // Rate Limiting
  rateLimitBaseDelay: number;
  rateLimitMaxRetries: number;

  // File Operations
  fileChunkSize: number;

  // Application Settings
  maxIterations: number;
  confirmActions: boolean;
}

// Default configuration values
const defaultConfig: Config = {
  llmApiKey: "",
  llmModel: "gpt-4",
  rateLimitBaseDelay: 1000, // 1 second
  rateLimitMaxRetries: 5,
  fileChunkSize: 1000, // lines
  maxIterations: 10,
  confirmActions: false,
};

// Load configuration from environment variables and command line arguments
function loadConfig(cliArgs: Record<string, any> = {}): Config {
  const config = { ...defaultConfig };

  // Override with environment variables
  if (process.env.LLM_API_KEY) config.llmApiKey = process.env.LLM_API_KEY;
  if (process.env.LLM_MODEL) config.llmModel = process.env.LLM_MODEL;
  if (process.env.RATE_LIMIT_BASE_DELAY)
    config.rateLimitBaseDelay = parseInt(process.env.RATE_LIMIT_BASE_DELAY, 10);
  if (process.env.RATE_LIMIT_MAX_RETRIES)
    config.rateLimitMaxRetries = parseInt(
      process.env.RATE_LIMIT_MAX_RETRIES,
      10
    );
  if (process.env.FILE_CHUNK_SIZE)
    config.fileChunkSize = parseInt(process.env.FILE_CHUNK_SIZE, 10);
  if (process.env.MAX_ITERATIONS)
    config.maxIterations = parseInt(process.env.MAX_ITERATIONS, 10);
  if (process.env.CONFIRM_ACTIONS)
    config.confirmActions =
      process.env.CONFIRM_ACTIONS.toLowerCase() === "true";

  // Override with CLI arguments
  if (cliArgs.llmApiKey) config.llmApiKey = cliArgs.llmApiKey;
  if (cliArgs.llmModel) config.llmModel = cliArgs.llmModel;
  if (cliArgs.rateLimitBaseDelay)
    config.rateLimitBaseDelay = cliArgs.rateLimitBaseDelay;
  if (cliArgs.rateLimitMaxRetries)
    config.rateLimitMaxRetries = cliArgs.rateLimitMaxRetries;
  if (cliArgs.fileChunkSize) config.fileChunkSize = cliArgs.fileChunkSize;
  if (cliArgs.maxIterations) config.maxIterations = cliArgs.maxIterations;
  if (cliArgs.confirmActions !== undefined)
    config.confirmActions = cliArgs.confirmActions;

  return config;
}

export { Config, loadConfig };
