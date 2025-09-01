import * as repo from '../../src/repositories/moldipediaRepository';
import { describe, it, expect } from '@jest/globals';
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
describe('moldipediaRepository (integration)', () => {
  if (!isEmulator) {
    it('skipped: requires Firestore emulator', () => { expect(true).toBe(true); });
    return;
  }
  it('should add, find, update, and delete a moldipedia entry', async () => {
  const testEntry = { name: 'testentry', description: 'desc', created_at: Date.now() };
  const addRes = await repo.addMoldipedia(testEntry as any);
  expect(addRes && addRes.id).toBeDefined();
  if (!addRes) return;
  const found = await repo.findMoldipediaById(addRes.id);
  expect(found && !found.empty).toBe(true);
  if (!found || found.empty) return;
  await repo.updateMoldipedia(addRes.id, { body: 'updateddesc' });
  const updated = await repo.findMoldipediaById(addRes.id);
  expect(updated && !updated.empty).toBe(true);
  if (!updated || updated.empty) return;
  expect(updated.docs[0].data()?.body).toBe('updateddesc');
  await repo.deleteMoldipedia(addRes.id);
  const deleted = await repo.findMoldipediaById(addRes.id);
  expect(deleted && !deleted.empty).toBe(false);
  });
});
