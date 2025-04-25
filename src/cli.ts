#!/usr/bin/env node
// Main CLI entry point
import { Command } from 'commander';
import { loadConfig } from '../config';
import { logger } from './utils/logger';

// Define the CLI program
const program = new Command();

// Configure CLI options and commands
program
  .name('coder-cli')
  .description('A CLI tool that replicates AI agent task-solving flow')
  .version('1.0.0');

// Main command for executing a task
program
  .argument('<task>', 'Task description to execute')
  .option('-k, --llm-api-key <key>', 'API key for the LLM provider')
  .option('-m, --llm-model <model>', 'Model name to use')
  .option('-r, --rate-limit-base-delay <ms>', 'Base delay for rate limiting in milliseconds', parseInt)
  .option('-x, --rate-limit-max-retries <count>', 'Maximum retry attempts for rate limiting', parseInt)
  .option('-c, --file-chunk-size <lines>', 'Size of file chunks to process', parseInt)
  .option('-i, --max-iterations <count>', 'Maximum iterations for the agent loop', parseInt)
  .option('--confirm-actions', 'Require confirmation before executing actions')
  .action(async (task: string, options) => {
    try {
      // Load configuration with CLI arguments
      const config = loadConfig(options);
      
      // Validate required configuration
      if (!config.llmApiKey) {
        logger.error('LLM API key is required. Set it via LLM_API_KEY env variable or --llm-api-key option.');
        process.exit(1);
      }
      
      logger.task(task);
      logger.system('Starting agent with configuration:');
      logger.system(`- Model: ${config.llmModel}`);
      logger.system(`- Max Iterations: ${config.maxIterations}`);
      logger.system(`- Confirm Actions: ${config.confirmActions}`);
      
      // TODO: Implement AgentController and execute the task
      logger.system('Agent controller not yet implemented in Phase 1.');
      logger.success('CLI setup and configuration loaded successfully.');
      
    } catch (error: any) {
      logger.error(`Failed to execute task: ${error.message}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);
