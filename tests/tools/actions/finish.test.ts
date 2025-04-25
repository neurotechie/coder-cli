import { execute } from "../../../src/tools/actions/finish";

describe("finish action", () => {
  test("should return success with reason message", async () => {
    const result = await execute({ reason: "Task completed successfully" });

    expect(result).toEqual({
      success: true,
      message: "Task completed successfully",
    });
  });

  test("should handle empty reason", async () => {
    const result = await execute({ reason: "" });

    expect(result).toEqual({
      success: true,
      message: "Task completed",
    });
  });
});
