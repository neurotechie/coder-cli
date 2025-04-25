import {
  readFileStats,
  readFileChunk,
  appendFileChunk,
} from "../../../src/tools/actions/fileSystem";
import * as fs from "fs/promises";
import * as readline from "readline";
import * as fsBase from "fs";
import { Readable } from "stream";

// Mock fs/promises and readline
jest.mock("fs/promises");
jest.mock("readline", () => ({
  createInterface: jest.fn(),
}));
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  createReadStream: jest.fn(),
}));

describe("fileSystem actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("readFileStats", () => {
    test("should return stats for an existing file", async () => {
      // Mock fs.stat to return file stats
      const mockStat = fs.stat as jest.Mock;
      mockStat.mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });

      // Mock fs.readFile to count lines
      const mockReadFile = fs.readFile as jest.Mock;
      mockReadFile.mockResolvedValue("line1\nline2\nline3\nline4\nline5");

      const result = await readFileStats({ path: "/path/to/file.txt" });

      expect(mockStat).toHaveBeenCalledWith("/path/to/file.txt");
      expect(result).toEqual({
        success: true,
        exists: true,
        size: 1024,
        lineCount: 5,
        message: "File stats retrieved successfully",
      });
    });

    test("should handle non-existent file", async () => {
      // Mock fs.stat to throw ENOENT error
      const mockStat = fs.stat as jest.Mock;
      const error = new Error("ENOENT: file not found");
      (error as any).code = "ENOENT";
      mockStat.mockRejectedValue(error);

      const result = await readFileStats({ path: "/path/to/nonexistent.txt" });

      expect(mockStat).toHaveBeenCalledWith("/path/to/nonexistent.txt");
      expect(result).toEqual({
        success: true,
        exists: false,
        size: 0,
        lineCount: 0,
        message: "File does not exist",
      });
    });

    test("should handle other errors", async () => {
      // Mock fs.stat to throw a different error
      const mockStat = fs.stat as jest.Mock;
      mockStat.mockRejectedValue(new Error("Permission denied"));

      const result = await readFileStats({ path: "/path/to/file.txt" });

      expect(mockStat).toHaveBeenCalledWith("/path/to/file.txt");
      expect(result).toEqual({
        success: false,
        exists: false,
        message: "Error getting file stats: Permission denied",
      });
    });
  });

  describe("readFileChunk", () => {
    test("should read chunk of file with specified line count", async () => {
      // Mock fs.stat to check file existence
      const mockStat = fs.stat as jest.Mock;
      mockStat.mockResolvedValue({
        isFile: () => true,
      });

      // Mock readline.createInterface
      const mockCreateInterface = readline.createInterface as jest.Mock;
      const mockReadlineInterface = {
        on: jest.fn(),
        close: jest.fn(),
      };

      let linesCalled = 0;

      // Simulate lines being read
      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === "line") {
          // Only call 3 lines and then call close to mimic the logic in readFileChunk
          for (let i = 0; i < 3 && linesCalled < 3; i++) {
            callback(`Line ${i + 1}`);
            linesCalled++;
          }
          // Simulate that readFileChunk closes the interface when it reaches lineCount
          if (linesCalled >= 3) {
            setTimeout(() => {
              // Simulate close event
              const closeCallback = mockReadlineInterface.on.mock.calls.find(
                (call) => call[0] === "close"
              )[1];
              closeCallback();
            }, 10);
          }
        }
        return mockReadlineInterface;
      });

      mockCreateInterface.mockReturnValue(mockReadlineInterface);

      // Mock fs.createReadStream
      const mockCreateReadStream = fsBase.createReadStream as jest.Mock;
      mockCreateReadStream.mockReturnValue(
        new Readable({
          read() {
            this.push(null); // No actual data, the lines are mocked by readline
          },
        })
      );

      const result = await readFileChunk({
        path: "/path/to/file.txt",
        startLine: 0,
        lineCount: 3,
      });

      expect(mockCreateReadStream).toHaveBeenCalledWith("/path/to/file.txt");
      expect(result).toEqual({
        success: true,
        content: "Line 1\nLine 2\nLine 3",
        readLines: 3,
        isEOF: false,
        message: "Read 3 lines from file",
      });
    });

    test("should handle non-existent file", async () => {
      // Mock fs.stat to throw ENOENT error
      const mockStat = fs.stat as jest.Mock;
      const error = new Error("ENOENT: file not found");
      (error as any).code = "ENOENT";
      mockStat.mockRejectedValue(error);

      const result = await readFileChunk({
        path: "/path/to/nonexistent.txt",
        startLine: 0,
        lineCount: 10,
      });

      expect(mockStat).toHaveBeenCalledWith("/path/to/nonexistent.txt");
      expect(result).toEqual({
        success: false,
        message: "File does not exist",
      });
    });

    test("should handle reading empty file", async () => {
      // Mock fs.stat to check file existence
      const mockStat = fs.stat as jest.Mock;
      mockStat.mockResolvedValue({
        isFile: () => true,
      });

      // Mock readline.createInterface
      const mockCreateInterface = readline.createInterface as jest.Mock;
      const mockReadlineInterface = {
        on: jest.fn(),
        close: jest.fn(),
      };

      // Simulate no lines being read (empty file)
      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === "close") {
          setTimeout(() => callback(), 10);
        }
        return mockReadlineInterface;
      });

      mockCreateInterface.mockReturnValue(mockReadlineInterface);

      // Mock fs.createReadStream
      const mockCreateReadStream = fsBase.createReadStream as jest.Mock;
      mockCreateReadStream.mockReturnValue(
        new Readable({
          read() {
            this.push(null);
          },
        })
      );

      const result = await readFileChunk({
        path: "/path/to/empty.txt",
        startLine: 0,
        lineCount: 10,
      });

      expect(mockCreateReadStream).toHaveBeenCalledWith("/path/to/empty.txt");
      expect(result).toEqual({
        success: true,
        content: "",
        readLines: 0,
        isEOF: true,
        message: "File is empty",
      });
    });
  });

  describe("appendFileChunk", () => {
    test("should append content to file", async () => {
      // Mock fs.appendFile
      const mockAppendFile = fs.appendFile as jest.Mock;
      mockAppendFile.mockResolvedValue(undefined);

      const result = await appendFileChunk({
        path: "/path/to/file.txt",
        content: "New content to append",
      });

      expect(mockAppendFile).toHaveBeenCalledWith(
        "/path/to/file.txt",
        "New content to append"
      );
      expect(result).toEqual({
        success: true,
        message: "Content appended successfully",
      });
    });

    test("should handle error when appending fails", async () => {
      // Mock fs.appendFile to throw an error
      const mockAppendFile = fs.appendFile as jest.Mock;
      mockAppendFile.mockRejectedValue(new Error("Permission denied"));

      const result = await appendFileChunk({
        path: "/path/to/file.txt",
        content: "New content to append",
      });

      expect(mockAppendFile).toHaveBeenCalledWith(
        "/path/to/file.txt",
        "New content to append"
      );
      expect(result).toEqual({
        success: false,
        message: "Error appending to file: Permission denied",
      });
    });
  });
});
