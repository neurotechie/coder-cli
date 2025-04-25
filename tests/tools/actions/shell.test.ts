import { execute } from "../../../src/tools/actions/shell";
import * as child_process from "child_process";

// Mock child_process.exec
jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

describe("shell action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should execute command and return result with stdout", async () => {
    // Setup mock implementation
    const mockExec = jest
      .spyOn(child_process, "exec")
      .mockImplementation((cmd, callback: any) => {
        if (callback) {
          callback(null, "command output", "");
        }
        return { on: jest.fn() } as any;
      });

    const result = await execute({ command: "ls -la" });

    expect(mockExec).toHaveBeenCalledWith("ls -la", expect.any(Function));
    expect(result).toEqual({
      success: true,
      exitCode: 0,
      stdout: "command output",
      stderr: "",
    });
  });

  test("should handle command execution error", async () => {
    // Setup mock implementation with error
    const mockExec = jest
      .spyOn(child_process, "exec")
      .mockImplementation((cmd, callback: any) => {
        const mockError: any = new Error("Command failed");
        mockError.code = 1;

        if (callback) {
          callback(mockError, "", "error output");
        }
        return { on: jest.fn() } as any;
      });

    const result = await execute({ command: "invalid-command" });

    expect(mockExec).toHaveBeenCalledWith(
      "invalid-command",
      expect.any(Function)
    );
    // Update the expectation to include the error field
    expect(result).toEqual({
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: "error output",
      error: "Command failed",
    });
  });

  test("should handle timeout for long-running commands", async () => {
    // Setup mock implementation that simulates timeout
    const mockExec = jest
      .spyOn(child_process, "exec")
      .mockImplementation((cmd, callback) => {
        // Return a mock child process
        return {
          on: (event: string, handler: Function) => {
            if (event === "error") {
              // Simulate command timing out
              setTimeout(() => {
                handler(new Error("Command timed out"));
              }, 10);
            }
            return { on: jest.fn() };
          },
        } as any;
      });

    const result = await execute({ command: "sleep 100" });

    expect(mockExec).toHaveBeenCalledWith("sleep 100", expect.any(Function));
    expect(result.success).toBe(false);
    expect(result.stderr).toContain("Command timed out");
  });
});
