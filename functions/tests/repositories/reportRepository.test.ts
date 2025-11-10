import * as repo from "../../src/repositories/reportRepository";
import {describe, it, expect} from "@jest/globals";

describe("reportRepository (integration)", () => {
  let globalId: string | null = null;

  it("should add the test report", async () => {
    const testReport = {
      title: "test",
      description: "desc",
      created_at: Date.now(),
    };
    const addRes = await repo.addReport(testReport as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it("should find the test report", async () => {
    if (globalId === null) throw new Error("globalId is null");
    const found = await repo.findReportById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it("should update the test report", async () => {
    await repo.updateReport(globalId!, {details: "updated"});
    const updated = await repo.findReportById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.details).toBe("updated");
  });

  it("should soft delete the test report", async () => {
    await repo.softDeleteReport(globalId!);
    const check = await repo.findReportById(globalId!);
    expect(check && check.exists).toBe(true);
    expect(check!.data()?.metadata.deleted_at).toBeDefined();
  });

  it("should delete the test report", async () => {
    await repo.deleteReport(globalId!);
    expect(await repo.findReportById(globalId!)).toBe(null);
  });

  describe("paginate reports", () => {
    it("should successfully paginate", async () => {
      // seed extra reports
      const extraReports = Array.from({length: 7}, (_, i) => ({
        reporter_id: `test_reporter_${i}`,
        title: `paginated_report_${i}`,
        description: "desc",
        created_at: Date.now(),
      }));
      for (let i = 0; i < extraReports.length; i++) {
        await repo.addReport(extraReports[i] as any);
      }
      const first = await repo.findAllReports(3);
      expect(first && first.snapshot.size).toBe(3);
      expect(first!.nextPageToken).toBeTruthy();
      const second = await repo.findAllReports(
        3,
        first!.nextPageToken || undefined
      );
      expect(second && second.snapshot.size).toBe(3);
      const third = await repo.findAllReports(
        3,
        second!.nextPageToken || undefined
      );
      expect(third && third.snapshot.size >= 1).toBe(true);
    });
  });
});
