import * as repo from "../../src/repositories/moldCaseRepository";
import {describe, it, expect} from "@jest/globals";

describe("moldCaseRepository (integration)", () => {
  let globalId: string | null = null;
  const testUid = "test_user";
  const isArchived = false;

  it("should add the test mold folder", async () => {
    const testFolder = {
      user_id: testUid,
      name: "test folder",
      photo_url: "",
      identified_mold: null,
      is_archived: isArchived,
      created_at: Date.now(),
    };
    const addRes = await repo.addMoldCase(testFolder as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it("should find the test mold folder", async () => {
    if (globalId === null) throw new Error("globalId is null");
    const found = await repo.findMoldCaseById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it("should update the test mold folder", async () => {
    await repo.updateMoldCase(globalId!, {name: "updated folder"});
    const updated = await repo.findMoldCaseById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.name).toBe("updated folder");
  });

  it("should soft delete the test mold folder", async () => {
    await repo.softDeleteMoldCase(globalId!);
    const check = await repo.findMoldCaseById(globalId!);
    expect(check && check.exists).toBe(true);
    expect(check!.data()?.metadata.deleted_at).toBeDefined();
  });

  it("should delete the test mold folder", async () => {
    await repo.deleteMoldCase(globalId!);
    expect(await repo.findMoldCaseById(globalId!)).toBe(null);
  });

  describe("paginate mold folders", () => {
    it("should successfully paginate", async () => {
      // seed extra folders
      const extraFolders = Array.from({length: 7}, (_, i) => ({
        user_id: testUid,
        name: `paginated_folder_${i}`,
        photo_url: "",
        identified_mold: null,
        is_archived: isArchived,
        created_at: Date.now(),
      }));
      for (let i = 0; i < extraFolders.length; i++) {
        await repo.addMoldCase(extraFolders[i] as any);
      }
      const first = await repo.findAllMoldCases(testUid, 3, isArchived);
      expect(first && first.snapshot.size).toBe(3);
      expect(first!.nextPageToken).toBeTruthy();
      const second = await repo.findAllMoldCases(
        testUid,
        3,
        isArchived,
        first!.nextPageToken || undefined
      );
      expect(second && second.snapshot.size).toBe(3);
      const third = await repo.findAllMoldCases(
        testUid,
        3,
        isArchived,
        second!.nextPageToken || undefined
      );
      expect(third && third.snapshot.size >= 1).toBe(true);
    });
  });
});
