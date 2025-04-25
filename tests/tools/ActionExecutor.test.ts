import { ActionExecutor } from "../../src/tools/ActionExecutor";
import { actionSchemas } from "../../src/tools/toolSchemas";

// Mock the action implementations
jest.mock("../../src/tools/actions/shell", () => ({
  execute: jest.fn().mockResolvedValue({
    success: true,
    exitCode: 0,
    stdout: "mocked stdout",
    stderr: "",
  }),
}));

jest.mock("../../src/tools/actions/fileSystem", () => ({
  readFileStats: jest.fn().mockResolvedValue({
    success: true,
    exists: true,
    size: 1024,
    lineCount: 42,
    message: "File stats retrieved successfully",
  }),
  readFileChunk: jest.fn().mockResolvedValue({
    success: true,
    content: "mocked file content",
    readLines: 10,
    isEOF: false,
    message: "Chunk read successfully",
  }),
  appendFileChunk: jest.fn().mockResolvedValue({
    success: true,
    message: "Content appended successfully",
  }),
}));

jest.mock("../../src/tools/actions/finish", () => ({
  execute: jest.fn().mockResolvedValue({
    success: true,
    message: "Task completed successfully",
  }),
}));

describe("ActionExecutor", () => {
  let actionExecutor: ActionExecutor;

  beforeEach(() => {
    actionExecutor = new ActionExecutor();
    jest.clearAllMocks();
  });

  test("should register all available actions", () => {
    // Check if all actions from actionSchemas are registered
    Object.keys(actionSchemas).forEach((actionName) => {
      expect(actionExecutor.isActionRegistered(actionName)).toBe(true);
    });
  });

  test("should execute shell action successfully", async () => {
    const shellAction = {
      name: "shell",
      parameters: {
        command: "ls -la",
      },
    };

    const result = await actionExecutor.execute(shellAction);

    expect(result).toEqual({
      success: true,
      exitCode: 0,
      stdout: "mocked stdout",
      stderr: "",
    });
  });

  test("should execute readFileStats action successfully", async () => {
    const readFileStatsAction = {
      name: "readFileStats",
      parameters: {
        path: "/path/to/file",
      },
    };

    const result = await actionExecutor.execute(readFileStatsAction);

    expect(result).toEqual({
      success: true,
      exists: true,
      size: 1024,
      lineCount: 42,
      message: "File stats retrieved successfully",
    });
  });

  test("should execute readFileChunk action successfully", async () => {
    const readFileChunkAction = {
      name: "readFileChunk",
      parameters: {
        path: "/path/to/file",
        startLine: 0,
        lineCount: 10,
      },
    };

    const result = await actionExecutor.execute(readFileChunkAction);

    expect(result).toEqual({
      success: true,
      content: "mocked file content",
      readLines: 10,
      isEOF: false,
      message: "Chunk read successfully",
    });
  });

  test("should execute appendFileChunk action successfully", async () => {
    const appendFileChunkAction = {
      name: "appendFileChunk",
      parameters: {
        path: "/path/to/file",
        content: "New content to append",
      },
    };

    const result = await actionExecutor.execute(appendFileChunkAction);

    expect(result).toEqual({
      success: true,
      message: "Content appended successfully",
    });
  });

  test("should execute finish action successfully", async () => {
    const finishAction = {
      name: "finish",
      parameters: {
        reason: "Task is complete",
      },
    };

    const result = await actionExecutor.execute(finishAction);

    expect(result).toEqual({
      success: true,
      message: "Task completed successfully",
    });
  });

  test("should reject invalid action names", async () => {
    const invalidAction = {
      name: "invalidActionName",
      parameters: {},
    };

    await expect(actionExecutor.execute(invalidAction)).rejects.toThrow(
      'Action "invalidActionName" is not registered'
    );
  });

  test("should validate required parameters", async () => {
    const shellActionMissingParams = {
      name: "shell",
      parameters: {},
    };

    await expect(
      actionExecutor.execute(shellActionMissingParams)
    ).rejects.toThrow(
      'Missing required parameter "command" for action "shell"'
    );
  });
});
