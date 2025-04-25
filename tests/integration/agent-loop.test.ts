/**
 * Integration tests for the complete agent loop flow
 */

import { AgentController, AgentConfig } from "../../src/core/AgentController";
import { LLMClient, LLMResponse } from "../../src/llm/LLMClient";
import { ActionExecutor } from "../../src/tools/ActionExecutor";

// Mock the LLMClient and ActionExecutor
jest.mock("../../src/llm/LLMClient", () => {
  return {
    LLMClient: jest.fn().mockImplementation(() => ({
      sendPrompt: jest.fn(),
      parseJSON: jest.fn(),
    })),
  };
});

jest.mock("../../src/tools/ActionExecutor");

describe("Agent Loop Integration", () => {
  let agentController: AgentController;
  let mockLLMClient: jest.Mocked<LLMClient>;
  let mockActionExecutor: jest.Mocked<ActionExecutor>;

  const task = "List files in the current directory";
  const config: AgentConfig = {
    maxIterations: 3,
    llmModel: "gpt-3.5-turbo",
    confirmActions: false,
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup LLMClient mock
    mockLLMClient = new LLMClient("test-key") as jest.Mocked<LLMClient>;

    // Setup ActionExecutor mock
    mockActionExecutor = {
      execute: jest.fn(),
      isActionRegistered: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<ActionExecutor>;

    (ActionExecutor as jest.Mock).mockImplementation(() => mockActionExecutor);

    // Create AgentController instance
    agentController = new AgentController(task, mockLLMClient, config);
  });

  test("should execute a complete agent loop with multiple actions", async () => {
    // Setup LLM responses for a sequence of actions
    mockLLMClient.sendPrompt
      // First action: shell command to list files
      .mockResolvedValueOnce({
        content:
          '{"action": {"name": "shell", "parameters": {"command": "ls -la"}}}',
      } as LLMResponse)
      // Second action: read a file
      .mockResolvedValueOnce({
        content:
          '{"action": {"name": "readFileChunk", "parameters": {"filePath": "test.txt", "startLine": 0, "numLines": 10}}}',
      } as LLMResponse)
      // Third action: finish the task
      .mockResolvedValueOnce({
        content:
          '{"action": {"name": "finish", "parameters": {"message": "Task completed successfully"}}}',
      } as LLMResponse);

    // Setup action execution results
    mockActionExecutor.execute
      // Result for shell command
      .mockResolvedValueOnce({
        success: true,
        stdout: "file1.txt\nfile2.txt",
        stderr: "",
      })
      // Result for file read
      .mockResolvedValueOnce({
        success: true,
        content: "File content here",
        isLastChunk: true,
      })
      // Result for finish action
      .mockResolvedValueOnce({
        success: true,
        message: "Task completed successfully",
      });

    // Run the agent
    await agentController.run();

    // Verify the correct sequence of interactions

    // Should have called sendPrompt 3 times
    expect(mockLLMClient.sendPrompt).toHaveBeenCalledTimes(3);

    // Should have executed 3 actions
    expect(mockActionExecutor.execute).toHaveBeenCalledTimes(3);

    // Verify action sequence
    expect(mockActionExecutor.execute.mock.calls[0][0].name).toBe("shell");
    expect(mockActionExecutor.execute.mock.calls[1][0].name).toBe(
      "readFileChunk"
    );
    expect(mockActionExecutor.execute.mock.calls[2][0].name).toBe("finish");

    // Check parameters of actions
    expect(mockActionExecutor.execute.mock.calls[0][0].parameters.command).toBe(
      "ls -la"
    );
    expect(
      mockActionExecutor.execute.mock.calls[1][0].parameters.filePath
    ).toBe("test.txt");
    expect(mockActionExecutor.execute.mock.calls[2][0].parameters.message).toBe(
      "Task completed successfully"
    );
  });

  test("should handle action failures gracefully", async () => {
    // Setup LLM responses
    mockLLMClient.sendPrompt
      // First action: shell command that fails
      .mockResolvedValueOnce({
        content:
          '{"action": {"name": "shell", "parameters": {"command": "invalid-command"}}}',
      } as LLMResponse)
      // Second action: successfully finish
      .mockResolvedValueOnce({
        content:
          '{"action": {"name": "finish", "parameters": {"message": "Handled the error"}}}',
      } as LLMResponse);

    // Setup action execution results - first action fails
    mockActionExecutor.execute
      .mockResolvedValueOnce({
        success: false,
        error: "Command not found",
      })
      .mockResolvedValueOnce({
        success: true,
        message: "Handled the error",
      });

    // Run the agent
    await agentController.run();

    // Should continue execution despite error
    expect(mockLLMClient.sendPrompt).toHaveBeenCalledTimes(2);
    expect(mockActionExecutor.execute).toHaveBeenCalledTimes(2);

    // Should have recorded both the error result and the finish result
    const history = (agentController as any).history;
    expect(history.length).toBe(4); // 2 actions + 2 observations

    // Check the error was recorded properly
    const errorObservation = history[1];
    expect(errorObservation.type).toBe("observation");
    expect(errorObservation.content).toContain('success": false');
  });
});
