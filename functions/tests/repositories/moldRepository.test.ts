import * as repo from "../../src/repositories/moldRepository";
import {describe, it, expect} from "@jest/globals";

describe("moldRepository (integration)", () => {
  let globalId: string | null = null;

  it("should add the test mold", async () => {
    const testMold = {name: "test mold", created_at: Date.now()};
    const addRes = await repo.addMold(testMold as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
    expect(addRes!.id).toBe(globalId!);
  });

  it("should find the test mold", async () => {
    if (globalId === null) throw new Error("globalId is null");
    const found = await repo.findMoldById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it("should update the test mold", async () => {
    await repo.updateMold(globalId!, {description: "updated"});
    const updated = await repo.findMoldById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.description).toBe("updated");
  });

  it("should soft delete the test mold", async () => {
    await repo.softDeleteMold(globalId!);
    const check = await repo.findMoldById(globalId!);
    expect(check && check.exists).toBe(true);
    expect(check!.data()?.metadata.deleted_at).toBeDefined();
  });

  it("should delete the test mold", async () => {
    await repo.deleteMold(globalId!);
    expect(await repo.findMoldById(globalId!)).toBe(null);
  });

  describe("paginate molds", () => {
    it("should successfully paginate", async () => {
      // seed extra molds
      const extraMolds = Array.from({length: 7}, (_, i) => ({
        name: `paginated_mold_${i}`,
        created_at: Date.now(),
      }));
      for (let i = 0; i < extraMolds.length; i++) {
        await repo.addMold(extraMolds[i] as any);
      }
      const first = await repo.findAllMolds(3);
      expect(first && first.snapshot.size).toBe(3);
      expect(first!.nextPageToken).toBeTruthy();
      const second = await repo.findAllMolds(
        3,
        first!.nextPageToken || undefined
      );
      expect(second && second.snapshot.size).toBe(3);
      const third = await repo.findAllMolds(
        3,
        second!.nextPageToken || undefined
      );
      expect(third && third.snapshot.size >= 1).toBe(true);
    });
  });
});
