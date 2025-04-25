/**
 * File System actions implementation
 * Provides actions for reading file stats, reading file chunks, and appending to files
 */
import * as fs from "fs/promises";
import { createReadStream } from "fs";
import * as readline from "readline";
import { ActionParams, ActionResult } from "../ActionExecutor";
import { logger } from "../../utils/logger";

/**
 * Get file statistics (size, line count, existence)
 *
 * @param params File parameters (path: string)
 * @returns Promise resolving to file stats
 */
export async function readFileStats(
  params: ActionParams
): Promise<ActionResult> {
  const { path } = params;

  try {
    // Check if the file exists and get its stats
    const stats = await fs.stat(path);

    if (!stats.isFile()) {
      return {
        success: false,
        exists: false,
        message: `Path exists but is not a file: ${path}`,
      };
    }

    // Get file content to count lines
    const content = await fs.readFile(path, "utf-8");
    const lineCount = content.split("\n").length;

    return {
      success: true,
      exists: true,
      size: stats.size,
      lineCount,
      message: "File stats retrieved successfully",
    };
  } catch (error: any) {
    // Handle case where file doesn't exist
    if (error.code === "ENOENT") {
      return {
        success: true,
        exists: false,
        size: 0,
        lineCount: 0,
        message: "File does not exist",
      };
    }

    // Handle other errors
    logger.error(`Error getting file stats: ${error.message}`);
    return {
      success: false,
      exists: false,
      message: `Error getting file stats: ${error.message}`,
    };
  }
}

/**
 * Read a chunk of a file specified by starting line and line count
 *
 * @param params File chunk parameters (path: string, startLine: number, lineCount: number)
 * @returns Promise resolving to file chunk content
 */
export async function readFileChunk(
  params: ActionParams
): Promise<ActionResult> {
  const { path, startLine, lineCount } = params;

  try {
    // Check if file exists
    await fs.stat(path);

    // We'll collect lines here
    let currentLineNumber = 0;
    let lines: string[] = [];
    let reachedEOF = false;

    return new Promise<ActionResult>((resolve) => {
      // Create a readline interface to read the file line by line
      const fileStream = createReadStream(path);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      // Process file line by line
      rl.on("line", (line) => {
        // Skip lines before startLine
        if (currentLineNumber < startLine) {
          currentLineNumber++;
          return;
        }

        // Add line to our collection
        lines.push(line);

        // Stop if we've collected enough lines
        if (lines.length >= lineCount) {
          rl.close();
          // Note: Don't close fileStream directly, it will be closed when readline closes
        }

        currentLineNumber++;
      });

      // When we're done reading
      rl.on("close", () => {
        // Check if we reached the end of file
        reachedEOF = lines.length < lineCount;

        // If we didn't collect any lines (empty file or startLine beyond EOF)
        if (lines.length === 0) {
          resolve({
            success: true,
            content: "",
            readLines: 0,
            isEOF: true,
            message: "File is empty",
          });
          return;
        }

        resolve({
          success: true,
          content: lines.join("\n"),
          readLines: lines.length,
          isEOF: reachedEOF,
          message: `Read ${lines.length} lines from file`,
        });
      });

      // Handle errors
      rl.on("error", (error) => {
        logger.error(`Error reading file chunk: ${error.message}`);
        resolve({
          success: false,
          message: `Error reading file chunk: ${error.message}`,
        });
      });

      // Handle file stream errors
      fileStream.on("error", (error) => {
        logger.error(`File stream error: ${error.message}`);
        rl.close();
        resolve({
          success: false,
          message: `File stream error: ${error.message}`,
        });
      });
    });
  } catch (error: any) {
    // Handle case where file doesn't exist
    if (error.code === "ENOENT") {
      return {
        success: false,
        message: "File does not exist",
      };
    }

    // Handle other errors
    logger.error(`Error reading file chunk: ${error.message}`);
    return {
      success: false,
      message: `Error reading file chunk: ${error.message}`,
    };
  }
}

/**
 * Append content to a file
 *
 * @param params Append parameters (path: string, content: string)
 * @returns Promise resolving to append result
 */
export async function appendFileChunk(
  params: ActionParams
): Promise<ActionResult> {
  const { path, content } = params;

  try {
    await fs.appendFile(path, content);

    return {
      success: true,
      message: "Content appended successfully",
    };
  } catch (error: any) {
    logger.error(`Error appending to file: ${error.message}`);
    return {
      success: false,
      message: `Error appending to file: ${error.message}`,
    };
  }
}
