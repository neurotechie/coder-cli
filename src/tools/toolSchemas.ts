/**
 * Action schemas/descriptions for prompts
 * These schemas define the available actions and their parameters
 */

// Base interface for all action schemas
export interface BaseActionSchema {
  name: string;
  description: string;
  parameters: Record<string, any>;
  required: string[];
}

// Shell action schema - allows executing shell commands
export const shellActionSchema: BaseActionSchema = {
  name: "shell",
  description: "Execute a shell command and return its output.",
  parameters: {
    command: {
      type: "string",
      description: "The shell command to execute.",
    },
  },
  required: ["command"],
};

// Read file stats action schema
export const readFileStatsSchema: BaseActionSchema = {
  name: "readFileStats",
  description: "Get metadata about a file (size, line count, existence).",
  parameters: {
    path: {
      type: "string",
      description: "The path to the file to read stats for.",
    },
  },
  required: ["path"],
};

// Read file chunk action schema - for handling large files
export const readFileChunkSchema: BaseActionSchema = {
  name: "readFileChunk",
  description:
    "Read a portion of a file specified by starting line and line count.",
  parameters: {
    path: {
      type: "string",
      description: "The path to the file to read.",
    },
    startLine: {
      type: "number",
      description: "The line number to start reading from (0-indexed).",
    },
    lineCount: {
      type: "number",
      description: "The number of lines to read.",
    },
  },
  required: ["path", "startLine", "lineCount"],
};

// Append to file action schema
export const appendFileChunkSchema: BaseActionSchema = {
  name: "appendFileChunk",
  description: "Append content to the end of a file.",
  parameters: {
    path: {
      type: "string",
      description: "The path to the file to append to.",
    },
    content: {
      type: "string",
      description: "The content to append to the file.",
    },
  },
  required: ["path", "content"],
};

// Finish action schema - signals that the task is complete
export const finishActionSchema: BaseActionSchema = {
  name: "finish",
  description: "Signal that the task is complete.",
  parameters: {
    reason: {
      type: "string",
      description: "The reason why the task is considered complete.",
    },
  },
  required: ["reason"],
};

// Export all action schemas in a map for easy access
export const actionSchemas: Record<string, BaseActionSchema> = {
  shell: shellActionSchema,
  readFileStats: readFileStatsSchema,
  readFileChunk: readFileChunkSchema,
  appendFileChunk: appendFileChunkSchema,
  finish: finishActionSchema,
};
