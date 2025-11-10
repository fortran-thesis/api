import * as repo from "../../src/repositories/moldipediaRepository";
import {describe, it, expect} from "@jest/globals";

describe("moldipediaRepository (integration)", () => {
  let globalId: string | null = null;

  it("should add the test moldipedia entry", async () => {
    const testEntry = {
      title: "test moldipedia",
      body: "body",
      author_id: "author",
      cover_photo: "",
      tags: [],
      created_at: Date.now(),
    };
    const addRes = await repo.addMoldipedia(testEntry as any);
    globalId = addRes!.id;
    expect(addRes && addRes.id).toBeDefined();
  });

  it("should find the test moldipedia entry", async () => {
    if (globalId === null) throw new Error("globalId is null");
    const found = await repo.findMoldipediaById(globalId);
    expect(found && found.exists).toBe(true);
  });

  it("should update the test moldipedia entry", async () => {
    await repo.updateMoldipedia(globalId!, {title: "updated moldipedia"});
    const updated = await repo.findMoldipediaById(globalId!);
    expect(updated && updated.exists).toBe(true);
    expect(updated!.data()?.title).toBe("updated moldipedia");
  });

  it("should soft delete the test moldipedia entry", async () => {
    await repo.softDeleteMoldipedia(globalId!);
    const check = await repo.findMoldipediaById(globalId!);
    expect(check && check.exists).toBe(true);
    expect(check!.data()?.metadata.deleted_at).toBeDefined();
  });

  it("should delete the test moldipedia entry", async () => {
    await repo.deleteMoldipedia(globalId!);
    expect(await repo.findMoldipediaById(globalId!)).toBe(null);
  });

  describe("paginate moldipedia entries", () => {
    it("should successfully paginate", async () => {
      // seed extra entries
      const extraEntries = Array.from({length: 7}, (_, i) => ({
        author_id: `author_${i}`,
        title: `paginated_moldipedia_${i}`,
        body: "body",
        cover_photo: "",
        tags: [],
        created_at: Date.now(),
      }));
      for (let i = 0; i < extraEntries.length; i++) {
        await repo.addMoldipedia(extraEntries[i] as any);
      }
      const first = await repo.findAllMoldipedia(3);
      expect(first && first.snapshot.size).toBe(3);
      expect(first!.nextPageToken).toBeTruthy();
      const second = await repo.findAllMoldipedia(
        3,
        first!.nextPageToken || undefined
      );
      expect(second && second.snapshot.size).toBe(3);
      const third = await repo.findAllMoldipedia(
        3,
        second!.nextPageToken || undefined
      );
      expect(third && third.snapshot.size >= 1).toBe(true);
    });
  });
});
