import * as repo from "../../src/repositories/flagReportRepository";
import {describe, it, expect} from "@jest/globals";

describe("flagReportRepository (integration)", () => {
  let globalId: string | null = null;

  it("should add the test flag report", async () => {
    const testData = {
      reason: "test",
      user_id: "user123",
      report_id: "report123",
      created_at: Date.now(),
    };
    const addRes = await repo.addFlagReport(testData as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it("should find the test flag report", async () => {
    if (globalId === null) throw new Error("globalId is null");
    const found = await repo.findFlagReportById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it("should update the test flag report", async () => {
    await repo.updateFlagReport(globalId!, {reason: "updated"});
    const updated = await repo.findFlagReportById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.reason).toBe("updated");
  });

  it("should delete the test flag report", async () => {
    await repo.deleteFlagReport(globalId!);
    expect(await repo.findFlagReportById(globalId!)).toBe(null);
  });
});
