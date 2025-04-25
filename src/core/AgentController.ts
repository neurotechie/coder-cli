/**
 * AgentController - Manages the main agent loop (Plan -> Execute -> Observe)
 *
 * Orchestrates the Plan -> Execute -> Observe loop, manages history,
 * formats prompts, and handles the execution of actions through the ActionExecutor.
 */

import { Action, ActionExecutor, ActionResult } from "../tools/ActionExecutor";
import { logger } from "../utils/logger";
import { LLMClient, LLMRequest } from "../llm/LLMClient";
import { Tokenizer } from "../llm/Tokenizer";
import { actionSchemas } from "../tools/toolSchemas";

// History item types
export type HistoryItemType = "plan" | "action" | "observation";

// History item structure
export interface HistoryItem {
  type: HistoryItemType;
  content: string;
  timestamp: number;
}

// Agent configuration
export interface AgentConfig {
  maxIterations: number;
  llmModel: string;
  confirmActions: boolean;
}

export class AgentController {
  private task: string;
  private history: HistoryItem[] = [];
  private currentPlan: string = "";
  private iterationCount: number = 0;
  private config: AgentConfig;
  private llmClient: LLMClient;
  private actionExecutor: ActionExecutor;
  private tokenizer: Tokenizer;

  constructor(task: string, llmClient: LLMClient, config: AgentConfig) {
    this.task = task;
    this.llmClient = llmClient;
    this.config = config;
    this.actionExecutor = new ActionExecutor();
    this.tokenizer = new Tokenizer();

    logger.task(this.task);
  }

  /**
   * Add an item to the agent's history
   */
  private addToHistory(type: HistoryItemType, content: string): void {
    this.history.push({
      type,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Get the system prompt base that defines the agent's capabilities
   */
  private getSystemPromptBase(): string {
    return `You are an AI assistant that helps users complete tasks. You work in steps:
1. Analyze the task and decide on a plan
2. Take actions one at a time to accomplish the plan
3. Observe results and adjust your plan if needed

Available actions:
${Object.entries(actionSchemas)
  .map(([name, schema]) => {
    const paramsDescription = schema.required
      .map((param) => `- ${param}: ${schema.parameters[param].description}`)
      .join("\n");

    return `## ${name}
${schema.description}

Parameters:
${paramsDescription}`;
  })
  .join("\n\n")}

When executing actions, respond ONLY with a valid JSON object with this format:
{
  "action": {
    "name": "actionName",
    "parameters": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}

The available actions are: ${Object.keys(actionSchemas).join(", ")}.
`;
  }

  /**
   * Format the prompt for the LLM based on current history and task
   */
  private formatPrompt(): string {
    // Get system prompt base
    const systemPrompt = this.getSystemPromptBase();

    // Format history items
    const historyText = this.history
      .map((item) => {
        switch (item.type) {
          case "plan":
            return `PLAN:\n${item.content}`;
          case "action":
            return `ACTION:\n${item.content}`;
          case "observation":
            return `OBSERVATION:\n${item.content}`;
          default:
            return "";
        }
      })
      .join("\n\n");

    // Combine all parts
    return `${systemPrompt}

TASK: ${this.task}

${historyText ? `HISTORY:\n${historyText}\n\n` : ""}

Based on the task${
      this.currentPlan ? ` and your current plan: "${this.currentPlan}"` : ""
    }, decide what action to take next.
Respond with ONLY a valid JSON action object as described earlier.`;
  }

  /**
   * Parse an action from the LLM response
   */
  private parseAction(response: string): Action {
    try {
      const parsed = this.llmClient.parseJSON<{ action: Action }>(response);
      return parsed.action;
    } catch (error: any) {
      throw new Error(
        `Failed to parse action from LLM response: ${error.message}`
      );
    }
  }

  /**
   * Execute a single iteration of the agent loop
   */
  private async executeIteration(): Promise<boolean> {
    this.iterationCount++;
    logger.system(
      `Starting iteration ${this.iterationCount}/${this.config.maxIterations}`
    );

    try {
      // 1. Format prompt
      const prompt = this.formatPrompt();

      // 2. Send to LLM
      const request: LLMRequest = {
        prompt,
        model: this.config.llmModel,
        temperature: 0.7,
      };

      const response = await this.llmClient.sendPrompt(request);

      // 3. Parse action from response
      const action = this.parseAction(response.content);
      logger.action(
        `Executing: ${action.name} with parameters: ${JSON.stringify(
          action.parameters
        )}`
      );
      this.addToHistory("action", JSON.stringify(action, null, 2));

      // 4. Execute action
      const result = await this.actionExecutor.execute(action);
      const resultStr = JSON.stringify(result, null, 2);
      logger.observation(resultStr);
      this.addToHistory("observation", resultStr);

      // 5. Check if we're done (finish action)
      if (action.name === "finish") {
        logger.success(
          `Task completed: ${result.message || "No message provided"}`
        );
        return true; // Signal completion
      }

      // 6. Check if we've hit the max iterations
      if (this.iterationCount >= this.config.maxIterations) {
        logger.system(
          `Reached maximum iterations (${this.config.maxIterations})`
        );
        return true; // Signal completion
      }

      return false; // Continue iterations
    } catch (error: any) {
      logger.error(
        `Error in iteration ${this.iterationCount}: ${error.message}`
      );
      return false; // Continue iterations despite error
    }
  }

  /**
   * Run the agent loop until completion or max iterations
   */
  public async run(): Promise<void> {
    logger.system(`Starting agent with task: ${this.task}`);
    logger.system(`Using model: ${this.config.llmModel}`);
    logger.system(`Max iterations: ${this.config.maxIterations}`);

    let done = false;

    while (!done) {
      done = await this.executeIteration();
    }

    logger.system(`Agent completed after ${this.iterationCount} iterations`);
  }
}
