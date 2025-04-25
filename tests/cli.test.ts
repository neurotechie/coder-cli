// Tests for the CLI command parsing

// First import the Command module so we can mock it properly
import { Command } from "commander";

// Mock the modules before importing the module under test
jest.mock("commander");
jest.mock("../config");
jest.mock("../src/utils/logger");

describe("CLI", () => {
  let mockProgram: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh mock for each test
    mockProgram = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      argument: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockReturnThis(),
      parse: jest.fn().mockReturnThis(),
    };

    // Make the Command constructor return our mockProgram
    (Command as jest.MockedClass<typeof Command>).mockImplementation(
      () => mockProgram as any
    );

    // Now load the CLI module which will use our mocks
    jest.isolateModules(() => {
      require("../src/cli");
    });
  });

  test("should set up CLI program with name, description, and version", () => {
    expect(mockProgram.name).toHaveBeenCalledWith("coder-cli");
    expect(mockProgram.description).toHaveBeenCalled();
    expect(mockProgram.version).toHaveBeenCalled();
  });

  test("should define an argument for the task", () => {
    expect(mockProgram.argument).toHaveBeenCalledWith(
      "<task>",
      expect.any(String)
    );
  });

  test("should define options for configuration", () => {
    // Verify that option was called multiple times
    expect(mockProgram.option.mock.calls.length).toBeGreaterThan(0);

    // Extract the option definitions from all calls
    const optionStrings = mockProgram.option.mock.calls.map(
      (call: any[]) => call[0] || ""
    );

    // Check that key options are included
    expect(optionStrings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("--llm-api-key"),
        expect.stringContaining("--llm-model"),
        expect.stringContaining("--rate-limit-base-delay"),
        expect.stringContaining("--max-iterations"),
        expect.stringContaining("--confirm-actions"),
      ])
    );
  });

  test("should set up an action handler for the command", () => {
    expect(mockProgram.action).toHaveBeenCalled();
  });

  test("should parse command line arguments", () => {
    expect(mockProgram.parse).toHaveBeenCalled();
  });
});
