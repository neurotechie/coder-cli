#!/usr/bin/env node
// Main CLI entry point
import { Command } from "commander";
import { loadConfig } from "./config"; // Updated import path
import { logger } from "./utils/logger";
import { ActionExecutor, Action } from "./tools/ActionExecutor";
import { AgentController } from "./core/AgentController";
import { OpenAIClient } from "./llm/providers/OpenAIClient";

// Define the CLI program
const program = new Command();

// Configure CLI options and commands
program
  .name("coder-cli")
  .description("A CLI tool that replicates AI agent task-solving flow")
  .version("1.0.0");

// Main command for executing a task
program
  .argument("<task>", "Task description to execute")
  .option("-k, --llm-api-key <key>", "API key for the LLM provider")
  .option("-m, --llm-model <model>", "Model name to use")
  .option(
    "-r, --rate-limit-base-delay <ms>",
    "Base delay for rate limiting in milliseconds",
    parseInt
  )
  .option(
    "-x, --rate-limit-max-retries <count>",
    "Maximum retry attempts for rate limiting",
    parseInt
  )
  .option(
    "-c, --file-chunk-size <lines>",
    "Size of file chunks to process",
    parseInt
  )
  .option(
    "-i, --max-iterations <count>",
    "Maximum iterations for the agent loop",
    parseInt
  )
  .option("--confirm-actions", "Require confirmation before executing actions")
  // Add direct action execution option
  .option(
    "-a, --action <action>",
    "Execute a specific action instead of using the agent loop"
  )
  .option(
    "-p, --parameters <parameters>",
    "JSON string of parameters for the action"
  )
  .action(async (task: string, options) => {
    try {
      // Load configuration with CLI arguments
      const config = loadConfig(options);

      // Validate required configuration
      if (!config.llmApiKey && !options.action) {
        logger.error(
          "LLM API key is required. Set it via LLM_API_KEY env variable or --llm-api-key option."
        );
        process.exit(1);
      }

      logger.task(task);
      logger.system("Starting with configuration:");
      logger.system(`- Model: ${config.llmModel}`);
      logger.system(`- Max Iterations: ${config.maxIterations}`);
      logger.system(`- Confirm Actions: ${config.confirmActions}`);

      // Check if we're running in direct action mode
      if (options.action) {
        logger.system("Running in direct action mode (bypassing agent loop)");

        // Initialize ActionExecutor
        const actionExecutor = new ActionExecutor();

        try {
          // Parse parameters
          const parameters = options.parameters
            ? JSON.parse(options.parameters)
            : {};

          // Create action object
          const action: Action = {
            name: options.action,
            parameters,
          };

          // Execute the action
          logger.action(`Executing action: ${options.action}`);
          logger.action(`Parameters: ${JSON.stringify(parameters, null, 2)}`);

          const result = await actionExecutor.execute(action);

          // Log the observation
          logger.observation(`Result: ${JSON.stringify(result, null, 2)}`);

          if (result.success) {
            logger.success("Action executed successfully.");
          } else {
            logger.error("Action execution failed.");
          }
        } catch (error: any) {
          logger.error(`Failed to execute action: ${error.message}`);
        }
      } else {
        // Full agent mode
        logger.system("Running in agent mode");

        try {
          // Initialize LLM client
          const llmClient = new OpenAIClient(config.llmApiKey);

          // Initialize agent controller
          const agentController = new AgentController(task, llmClient, {
            maxIterations: config.maxIterations,
            llmModel: config.llmModel,
            confirmActions: config.confirmActions,
          });

          // Run the agent
          await agentController.run();
        } catch (error: any) {
          logger.error(`Agent execution failed: ${error.message}`);
        }
      }
    } catch (error: any) {
      logger.error(`Failed to execute task: ${error.message}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);
