// Formatted console logging utility
import chalk from 'chalk';

// Logger class to provide standardized, color-coded console output
class Logger {
  /**
   * Log a task message (user input)
   */
  task(message: string): void {
    console.log(chalk.blue.bold(`[Task] ${message}`));
  }

  /**
   * Log a plan message (LLM planning output)
   */
  plan(message: string): void {
    console.log(chalk.green(`[Plan] ${message}`));
  }

  /**
   * Log an action message (LLM executing an action)
   */
  action(message: string): void {
    console.log(chalk.yellow(`[Action] ${message}`));
  }

  /**
   * Log an observation message (result of an action)
   */
  observation(message: string): void {
    console.log(chalk.cyan(`[Observation] ${message}`));
  }

  /**
   * Log a system message (internal processes)
   */
  system(message: string): void {
    console.log(chalk.magenta(`[System] ${message}`));
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    console.error(chalk.red.bold(`[Error] ${message}`));
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    console.log(chalk.green.bold(`[Success] ${message}`));
  }
}

// Export singleton instance
export const logger = new Logger();
