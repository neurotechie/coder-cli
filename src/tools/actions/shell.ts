/**
 * Shell action implementation
 * Executes shell commands and returns results
 */
import { exec } from "child_process";
import { ActionParams, ActionResult } from "../ActionExecutor";
import { logger } from "../../utils/logger";

/**
 * Execute a shell command
 *
 * @param params Command parameters (command: string)
 * @returns Promise resolving to command execution result
 */
export async function execute(params: ActionParams): Promise<ActionResult> {
  const { command } = params;

  return new Promise((resolve) => {
    logger.system(`Executing command: ${command}`);

    const childProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Command execution failed: ${error.message}`);
        resolve({
          success: false,
          exitCode: error.code || 1,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          error: error.message,
        });
        return;
      }

      resolve({
        success: true,
        exitCode: 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      });
    });

    childProcess.on("error", (error) => {
      logger.error(`Command process error: ${error.message}`);
      resolve({
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: error.message,
        error: error.message,
      });
    });
  });
}
