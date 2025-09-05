import * as firestoreLib from '../../src/lib/firestore';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  getDocumentsByField,
  getDocumentIdByField,
  getDocumentByFieldId,
  getDocumentById,
  getPaginatedDocuments,
  deleteCollection,
  softDeleteDocument,
  getFirestore
} from '../../src/lib/firestore';
import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';

const TEST_COLLECTION = 'test_collection';

describe('firestore lib (integration)', () => {
  describe('handle CRUD operations', () => {
    it('should add and retrieve a document by ID', async () => {
      const testData = { name: 'testuser', value: 42 };
      const addRes = await addDocument(TEST_COLLECTION, testData);
      expect(addRes && addRes.id).toBeDefined();
      const found = await getDocumentById(TEST_COLLECTION, addRes!.id);
      expect(found && found.exists).toBe(true);
      expect(found!.data()?.name).toBe('testuser');
    });

    
    it('should not add duplicates.', async () => {
      const testData = { name: 'test' };
      await addDocument(TEST_COLLECTION, testData, "test_id");
      await expect(addDocument(TEST_COLLECTION, testData, "test_id")).resolves.toBeNull();
    })

    describe('handle retrieval of data', () => {
        it('should get documents by field', async () => {
          const testData = { name: 'fielduser', value: 123 };
          await addDocument(TEST_COLLECTION, testData);
          const querySnap = await getDocumentsByField(TEST_COLLECTION, 'name', 'fielduser');
          expect(querySnap && !querySnap.empty).toBe(true);
          expect(querySnap!.docs[0].data().value).toBe(123);
        });

        it('should get document ID by field', async () => {
          const testData = { name: 'idbyfielduser', value: 456 };
          const addRes = await addDocument(TEST_COLLECTION, testData);
          const docId = await getDocumentIdByField(TEST_COLLECTION, 'name', 'idbyfielduser');
          expect(docId).toBe(addRes!.id);
        });

        it('should get document snapshot by field', async () => {
          const testData = { name: 'snapbyfielduser', value: 789 };
          await addDocument(TEST_COLLECTION, testData);
          const docSnap = await getDocumentByFieldId(TEST_COLLECTION, 'name', 'snapbyfielduser');
          expect(docSnap && docSnap.exists).toBe(true);
          expect(docSnap!.data()?.value).toBe(789);
        });

        it('should get document by id using getDocumentById', async () => {
          const testData = { name: 'byiduser', value: 321 };
          const addRes = await addDocument(TEST_COLLECTION, testData);
          const querySnap = await getDocumentById(TEST_COLLECTION, addRes!.id);
          expect(querySnap && querySnap.exists).toBe(true);
          expect(querySnap!.data()?.name).toBe('byiduser');
        });

        describe('pagination', () => {
          const PAGINATE_COLLECTION = 'paginate_test_collection';
          const PAGE_SIZE = 5;
          const testRecords = Array.from({ length: 10 }, (_, i) => ({ name: `user${i+1}`, value: i+1 }));

          let nextPageToken: string | undefined = undefined;

          beforeAll(async () => {
            await firestoreLib.deleteCollection(PAGINATE_COLLECTION);
            for (const rec of testRecords) {
              await addDocument(PAGINATE_COLLECTION, rec);
            }
          });

          it('should retrieve first page of paginated documents', async () => {
            const result = await getPaginatedDocuments(PAGINATE_COLLECTION, PAGE_SIZE, undefined, ["value"]);
            expect(result && result.snapshot.size).toBe(PAGE_SIZE);
            const names = result!.snapshot.docs.map(doc => doc.data().name);
            expect(names).toEqual(testRecords.slice(0, PAGE_SIZE).map(r => r.name));
            nextPageToken = result!.nextPageToken ?? undefined;
          });

          it('should retrieve second page of paginated documents', async () => {
            const result = await getPaginatedDocuments(PAGINATE_COLLECTION, PAGE_SIZE, nextPageToken, ["value"]);
            expect(result && result.snapshot.size).toBe(PAGE_SIZE);
            const names = result!.snapshot.docs.map(doc => doc.data().name);
            expect(names).toEqual(testRecords.slice(PAGE_SIZE, PAGE_SIZE * 2).map(r => r.name));
          });

          afterAll(async () => {
            await firestoreLib.deleteCollection(PAGINATE_COLLECTION);
          });
        });
    });

    it('should update a document and verify the change', async () => {
      const testData = { name: 'updateuser', value: 1 };
      const addRes = await addDocument(TEST_COLLECTION, testData);
      expect(addRes && addRes.id).toBeDefined();
      await updateDocument(TEST_COLLECTION, addRes!.id, { value: 99 });
      const updated = await getDocumentById(TEST_COLLECTION, addRes!.id);
      expect(updated!.data()?.value).toBe(99);
    });

    it('should not update a non-existing user', async () => {
      await expect(updateDocument(TEST_COLLECTION, "non-existed document", {value: 2})).resolves.toBeNull();
    });
 
    it('should delete a document', async () => {
      const testData = { name: 'deleteuser', value: 555 };
      const addRes = await addDocument(TEST_COLLECTION, testData);
      expect(addRes && addRes.id).toBeDefined();
      await deleteDocument(TEST_COLLECTION, addRes!.id);
      const found = await getDocumentById(TEST_COLLECTION, addRes!.id);
      expect(found && found.exists).toBe(null);
    });

    it('should not delete a non-existing user', async () => {
      await expect(deleteDocument(TEST_COLLECTION, "non-existed document")).resolves.toBeNull();
    });

    it('should soft delete a document', async () => {
      const testData = { name: 'softdeleteuser', value: 666 };
      const addRes = await addDocument(TEST_COLLECTION, testData);
      expect(addRes && addRes.id).toBeDefined();
      await softDeleteDocument(TEST_COLLECTION, addRes!.id);
      const found = await getDocumentById(TEST_COLLECTION, addRes!.id);
      expect(found && found.exists).toBe(true);
      expect(found!.data()?.metadata?.deleted_at).toBeDefined();
    });
  });

    it('should not soft delete a non-existing user', async () => {
      await expect(softDeleteDocument(TEST_COLLECTION, "non-existed document")).resolves.toBeNull();
    });

  afterAll(async () => {
    await deleteCollection(TEST_COLLECTION);
    if (typeof getFirestore().terminate === "function") {
      await getFirestore().terminate();
    }
  });
});
