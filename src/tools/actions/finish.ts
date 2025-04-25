/**
 * Finish action implementation
 * Signals that the task is complete
 */
import { ActionParams, ActionResult } from "../ActionExecutor";
import { logger } from "../../utils/logger";

/**
 * Execute the finish action
 *
 * @param params Finish parameters (reason: string)
 * @returns Promise resolving to finish result
 */
export async function execute(params: ActionParams): Promise<ActionResult> {
  const { reason } = params;
  const message = reason || "Task completed";

  logger.success(`Task finished: ${message}`);

  return {
    success: true,
    message,
  };
}
