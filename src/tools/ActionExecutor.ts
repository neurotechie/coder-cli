/**
 * Action Executor - Executes validated actions
 *
 * Manages registration of available actions and handles execution
 * by validating parameters and delegating to the appropriate action handler.
 */

import { logger } from "../utils/logger";
import { actionSchemas, BaseActionSchema } from "./toolSchemas";

// Import action implementations
import * as shellAction from "./actions/shell";
import * as fileSystemActions from "./actions/fileSystem";
import * as finishAction from "./actions/finish";

// Interface for action parameters
export interface ActionParams {
  [key: string]: any;
}

// Interface for action object
export interface Action {
  name: string;
  parameters: ActionParams;
}

// Interface for action results
export interface ActionResult {
  success: boolean;
  [key: string]: any;
}

// Type for action execution functions
type ActionExecutionFunction = (params: ActionParams) => Promise<ActionResult>;

export class ActionExecutor {
  private actionRegistry: Map<string, ActionExecutionFunction>;

  constructor() {
    this.actionRegistry = new Map();
    this.registerActions();
  }

  /**
   * Register all available actions
   */
  private registerActions(): void {
    // Register shell action
    this.registerAction("shell", shellAction.execute);

    // Register file system actions
    this.registerAction("readFileStats", fileSystemActions.readFileStats);
    this.registerAction("readFileChunk", fileSystemActions.readFileChunk);
    this.registerAction("appendFileChunk", fileSystemActions.appendFileChunk);

    // Register finish action
    this.registerAction("finish", finishAction.execute);
  }

  /**
   * Register a single action
   */
  private registerAction(
    name: string,
    executionFn: ActionExecutionFunction
  ): void {
    this.actionRegistry.set(name, executionFn);
    logger.system(`Registered action: ${name}`);
  }

  /**
   * Check if an action is registered
   */
  public isActionRegistered(name: string): boolean {
    return this.actionRegistry.has(name);
  }

  /**
   * Validate action parameters against schema
   */
  private validateParameters(action: Action, schema: BaseActionSchema): void {
    const { name, parameters } = action;

    // Check required parameters
    for (const requiredParam of schema.required) {
      if (parameters[requiredParam] === undefined) {
        throw new Error(
          `Missing required parameter "${requiredParam}" for action "${name}"`
        );
      }
    }

    // Additional validation could be added here, such as type checking
  }

  /**
   * Execute an action and return the result
   */
  public async execute(action: Action): Promise<ActionResult> {
    const { name, parameters } = action;

    // Check if action exists
    if (!this.isActionRegistered(name)) {
      throw new Error(`Action "${name}" is not registered`);
    }

    // Get the action schema for validation
    const schema = actionSchemas[name];
    if (!schema) {
      throw new Error(`Schema not found for action "${name}"`);
    }

    // Validate parameters against schema
    this.validateParameters(action, schema);

    // Get the execution function
    const executionFn = this.actionRegistry.get(name)!;

    try {
      // Execute the action
      logger.system(`Executing action: ${name}`);
      const result = await executionFn(parameters);
      return result;
    } catch (error: any) {
      logger.error(`Error executing action "${name}": ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
