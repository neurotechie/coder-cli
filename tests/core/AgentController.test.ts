/**
 * Tests for the AgentController
 */

import {
  AgentController,
  AgentConfig,
  HistoryItem,
} from "../../src/core/AgentController";
import { LLMClient, LLMResponse } from "../../src/llm/LLMClient";
import { ActionExecutor, Action } from "../../src/tools/ActionExecutor";

// Mock dependencies
jest.mock("../../src/llm/LLMClient", () => {
  return {
    LLMClient: jest.fn().mockImplementation(() => ({
      sendPrompt: jest.fn(),
      parseJSON: jest.fn(),
    })),
  };
});

jest.mock("../../src/tools/ActionExecutor");

describe("AgentController", () => {
  let agentController: AgentController;
  let mockLLMClient: jest.Mocked<LLMClient>;
  let mockActionExecutor: jest.Mocked<ActionExecutor>;

  const defaultTask = "Test task";
  const defaultConfig: AgentConfig = {
    maxIterations: 5,
    llmModel: "test-model",
    confirmActions: false,
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup LLMClient mock
    mockLLMClient = new LLMClient("test-key") as jest.Mocked<LLMClient>;

    // Setup ActionExecutor mock
    (ActionExecutor as jest.Mock).mockImplementation(() => ({
      execute: jest
        .fn()
        .mockResolvedValue({ success: true, result: "test-result" }),
    }));
    mockActionExecutor = new ActionExecutor() as jest.Mocked<ActionExecutor>;

    // Create AgentController instance
    agentController = new AgentController(
      defaultTask,
      mockLLMClient,
      defaultConfig
    );
  });

  describe("constructor", () => {
    test("should initialize with the provided task and configuration", () => {
      expect(agentController["task"]).toBe(defaultTask);
      expect(agentController["config"]).toEqual(defaultConfig);
      expect(agentController["llmClient"]).toBe(mockLLMClient);
      expect(ActionExecutor).toHaveBeenCalled();
    });
  });

  describe("addToHistory", () => {
    test("should add an item to the history", () => {
      const type = "action";
      const content = "test content";

      // Access the private method for testing
      (agentController as any).addToHistory(type, content);

      const history: HistoryItem[] = (agentController as any).history;
      expect(history.length).toBe(1);
      expect(history[0].type).toBe(type);
      expect(history[0].content).toBe(content);
      expect(history[0].timestamp).toBeDefined();
    });
  });

  describe("formatPrompt", () => {
    test("should include the task in the prompt", () => {
      const prompt = (agentController as any).formatPrompt();
      expect(prompt).toContain(`TASK: ${defaultTask}`);
    });

    test("should include history items in the prompt if present", () => {
      // Add some history items
      (agentController as any).addToHistory("plan", "test plan");
      (agentController as any).addToHistory("action", "test action");
      (agentController as any).addToHistory("observation", "test observation");

      const prompt = (agentController as any).formatPrompt();

      expect(prompt).toContain("PLAN:\ntest plan");
      expect(prompt).toContain("ACTION:\ntest action");
      expect(prompt).toContain("OBSERVATION:\ntest observation");
    });

    test("should include the current plan if set", () => {
      (agentController as any).currentPlan = "Current test plan";
      const prompt = (agentController as any).formatPrompt();
      expect(prompt).toContain(`your current plan: "Current test plan"`);
    });
  });

  describe("parseAction", () => {
    test("should parse valid action JSON", () => {
      const actionJson =
        '{"action": {"name": "test-action", "parameters": {"param1": "value1"}}}';

      // Setup the parseJSON mock to return a specific value
      mockLLMClient.parseJSON.mockReturnValue({
        action: {
          name: "test-action",
          parameters: { param1: "value1" },
        },
      });

      const action = (agentController as any).parseAction(actionJson);

      expect(mockLLMClient.parseJSON).toHaveBeenCalledWith(actionJson);
      expect(action).toEqual({
        name: "test-action",
        parameters: { param1: "value1" },
      });
    });

    test("should throw an error for invalid action JSON", () => {
      mockLLMClient.parseJSON.mockImplementation(() => {
        throw new Error("JSON parse error");
      });

      expect(() =>
        (agentController as any).parseAction("invalid json")
      ).toThrow("Failed to parse action");
    });
  });

  describe("executeIteration", () => {
    test("should execute a complete iteration", async () => {
      // Setup mocks for a successful iteration
      const actionResponse = {
        content:
          '{"action": {"name": "shell", "parameters": {"command": "ls"}}}',
      } as LLMResponse;

      mockLLMClient.sendPrompt.mockResolvedValue(actionResponse);
      mockLLMClient.parseJSON.mockReturnValue({
        action: {
          name: "shell",
          parameters: { command: "ls" },
        },
      });

      const actionResult = { success: true, stdout: "file1\nfile2" };
      (agentController as any).actionExecutor.execute.mockResolvedValue(
        actionResult
      );

      // Execute one iteration
      const done = await (agentController as any).executeIteration();

      // Verify the iteration flow
      expect(mockLLMClient.sendPrompt).toHaveBeenCalled();
      expect(mockLLMClient.parseJSON).toHaveBeenCalled();
      expect(
        (agentController as any).actionExecutor.execute
      ).toHaveBeenCalledWith({
        name: "shell",
        parameters: { command: "ls" },
      });

      // Should not be done yet
      expect(done).toBe(false);

      // History should have been updated
      const history: HistoryItem[] = (agentController as any).history;
      expect(history.length).toBe(2); // action and observation
    });

    test("should handle finish action", async () => {
      // Setup mocks for a finish action
      const actionResponse = {
        content:
          '{"action": {"name": "finish", "parameters": {"message": "Task complete"}}}',
      } as LLMResponse;

      mockLLMClient.sendPrompt.mockResolvedValue(actionResponse);
      mockLLMClient.parseJSON.mockReturnValue({
        action: {
          name: "finish",
          parameters: { message: "Task complete" },
        },
      });

      const actionResult = { success: true, message: "Task complete" };
      (agentController as any).actionExecutor.execute.mockResolvedValue(
        actionResult
      );

      // Execute one iteration
      const done = await (agentController as any).executeIteration();

      // Should be done
      expect(done).toBe(true);
    });

    test("should handle max iterations", async () => {
      // Set iteration count to max
      (agentController as any).iterationCount = defaultConfig.maxIterations - 1;

      // Setup mocks for a normal action
      const actionResponse = {
        content:
          '{"action": {"name": "shell", "parameters": {"command": "ls"}}}',
      } as LLMResponse;

      mockLLMClient.sendPrompt.mockResolvedValue(actionResponse);
      mockLLMClient.parseJSON.mockReturnValue({
        action: {
          name: "shell",
          parameters: { command: "ls" },
        },
      });

      const actionResult = { success: true, stdout: "file1\nfile2" };
      (agentController as any).actionExecutor.execute.mockResolvedValue(
        actionResult
      );

      // Execute one iteration
      const done = await (agentController as any).executeIteration();

      // Should be done due to max iterations
      expect(done).toBe(true);
    });

    test("should handle errors during iteration", async () => {
      // Make the LLM client throw an error
      mockLLMClient.sendPrompt.mockRejectedValue(new Error("LLM error"));

      // Execute one iteration
      const done = await (agentController as any).executeIteration();

      // Should not be done despite error
      expect(done).toBe(false);
    });
  });

  describe("run", () => {
    test("should execute iterations until done", async () => {
      // Mock executeIteration to finish after 3 calls
      const executeIterationSpy = jest
        .spyOn(agentController as any, "executeIteration")
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await agentController.run();

      expect(executeIterationSpy).toHaveBeenCalledTimes(3);
    });
  });
});
