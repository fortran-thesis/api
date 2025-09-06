import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import * as moldFolderService from '../../../src/services/moldFolderService';
import * as moldFolderRepository from '../../../src/repositories/moldFolderRespository';
import * as firestoreLib from '../../../src/lib/firestore';
import { MoldFolder } from '../../../src/types/types';

// Mock all external dependencies
jest.mock('../../../src/repositories/moldFolderRespository');
jest.mock('../../../src/lib/firestore');
jest.mock('../../../src/utils/dev');
jest.mock('../../../src/configs/redis', () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockMoldFolderRepository = moldFolderRepository as jest.Mocked<typeof moldFolderRepository>;
const mockFirestoreLib = firestoreLib as jest.Mocked<typeof firestoreLib>;

describe('moldFolderService (unit)', () => {
  const mockMoldFolder: MoldFolder = {
    name: 'Test Folder',
    description: 'A test folder',
    user_id: 'test-user-id',
    is_archived: false,
  };

  const mockMoldFolderWithId = {
    id: 'test-folder-id',
    ...mockMoldFolder,
    metadata: {
      created_at: Timestamp.now(),
      updated_at: null,
      deleted_at: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addMoldFolderToFirestore', () => {
    it('should successfully add a mold folder', async () => {
      const mockDocSnapshot = {
        id: 'test-folder-id',
        data: jest.fn().mockReturnValue(mockMoldFolderWithId),
        exists: true,
      };

      mockMoldFolderRepository.addMoldFolder.mockResolvedValue(mockDocSnapshot as any);
      mockFirestoreLib.documentToJson.mockReturnValue(mockMoldFolderWithId as any);

      const result = await moldFolderService.addMoldFolderToFirestore(mockMoldFolder);

      expect(result).toEqual(mockMoldFolderWithId);
      expect(mockMoldFolderRepository.addMoldFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockMoldFolder,
          metadata: expect.objectContaining({
            created_at: expect.any(Timestamp),
            updated_at: null,
            deleted_at: null,
          }),
        })
      );
    });

    it('should return null on repository failure', async () => {
      mockMoldFolderRepository.addMoldFolder.mockResolvedValue(null);

      const result = await moldFolderService.addMoldFolderToFirestore(mockMoldFolder);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockMoldFolderRepository.addMoldFolder.mockRejectedValue(new Error('Database error'));

      const result = await moldFolderService.addMoldFolderToFirestore(mockMoldFolder);

      expect(result).toBeNull();
    });
  });

  describe('retrieveMoldFolderById', () => {
    it('should retrieve mold folder by ID', async () => {
      const folderId = 'test-folder-id';
      const mockDocSnapshot = {
        id: folderId,
        data: jest.fn().mockReturnValue(mockMoldFolderWithId),
        exists: true,
      };

      mockMoldFolderRepository.findMoldFolderById.mockResolvedValue(mockDocSnapshot as any);
      mockFirestoreLib.documentToJson.mockReturnValue(mockMoldFolderWithId as any);

      const result = await moldFolderService.retrieveMoldFolderById(folderId);

      expect(result).toEqual(mockMoldFolderWithId);
      expect(mockMoldFolderRepository.findMoldFolderById).toHaveBeenCalledWith(folderId);
    });

    it('should return null if folder not found', async () => {
      const folderId = 'nonexistent-folder';
      mockMoldFolderRepository.findMoldFolderById.mockResolvedValue(null);

      const result = await moldFolderService.retrieveMoldFolderById(folderId);

      expect(result).toBeNull();
    });
  });

  describe('retrieveMoldFolderByName', () => {
    it('should retrieve mold folder by name', async () => {
      const folderName = 'Test Folder';
      const mockQuerySnapshot = {
        docs: [{ id: 'test-id', data: jest.fn().mockReturnValue(mockMoldFolderWithId) }],
      };

      mockMoldFolderRepository.findMoldFolderByName.mockResolvedValue(mockQuerySnapshot as any);
      mockFirestoreLib.queryToJson.mockReturnValue([mockMoldFolderWithId] as any);

      const result = await moldFolderService.retrieveMoldFolderByName(folderName);

      expect(result).toEqual(mockMoldFolderWithId);
      expect(mockMoldFolderRepository.findMoldFolderByName).toHaveBeenCalledWith(folderName);
    });

    it('should return null if no folders found', async () => {
      const folderName = 'Nonexistent Folder';
      const mockQuerySnapshot = { docs: [] };

      mockMoldFolderRepository.findMoldFolderByName.mockResolvedValue(mockQuerySnapshot as any);
      mockFirestoreLib.queryToJson.mockReturnValue([]);

      const result = await moldFolderService.retrieveMoldFolderByName(folderName);

      expect(result).toBeNull();
    });
  });

  describe('retrieveAllMoldFoldersByUser', () => {
    it('should retrieve paginated mold folders by user', async () => {
      const userId = 'test-user-id';
      const limit = 10;
      const mockPaginatedResult = {
        snapshot: [mockMoldFolderWithId],
        nextPageToken: null,
      };

      mockMoldFolderRepository.findAllMoldFolders.mockResolvedValue(mockPaginatedResult as any);
      mockFirestoreLib.queryToJson.mockReturnValue([mockMoldFolderWithId]);

      const result = await moldFolderService.retrieveAllMoldFoldersByUser(userId, limit);

      expect(result).toEqual(mockPaginatedResult);
      expect(mockMoldFolderRepository.findAllMoldFolders).toHaveBeenCalledWith(limit, undefined);
    });

    it('should use custom pagination token and archived flag', async () => {
      const userId = 'test-user-id';
      const limit = 5;
      const isArchived = true;
      const token = 'pagination-token-123';
      const mockPaginatedResult = {
        snapshot: [],
        nextPageToken: null,
      };

      mockMoldFolderRepository.findAllMoldFolders.mockResolvedValue(mockPaginatedResult as any);
      mockFirestoreLib.queryToJson.mockReturnValue([]);

      const result = await moldFolderService.retrieveAllMoldFoldersByUser(userId, limit, isArchived, token);

      expect(result).toEqual(mockPaginatedResult);
      expect(mockMoldFolderRepository.findAllMoldFolders).toHaveBeenCalledWith(limit, token);
    });
  });

  describe('updateMoldFolderInFirestore', () => {
    it('should successfully update a mold folder', async () => {
      const folderId = 'test-folder-id';
      const updateData = { name: 'Updated Folder Name' };
      const mockWriteResult = { writeTime: Timestamp.now() };

      (mockMoldFolderRepository as any).updateMoldFolderRepo = jest.fn().mockResolvedValue(mockWriteResult);

      const updatedFolder = { ...mockMoldFolderWithId, ...updateData };
      jest.spyOn(moldFolderService, 'retrieveMoldFolderById').mockResolvedValue(updatedFolder as any);

      const result = await moldFolderService.updateMoldFolderInFirestore(folderId, updateData);

      expect(result).toEqual(updatedFolder);
      expect((mockMoldFolderRepository as any).updateMoldFolderRepo).toHaveBeenCalledWith(folderId, updateData);
    });

    it('should return null if update fails', async () => {
      const folderId = 'test-folder-id';
      const updateData = { name: 'Updated Folder Name' };

      (mockMoldFolderRepository as any).updateMoldFolderRepo = jest.fn().mockResolvedValue(null);

      const result = await moldFolderService.updateMoldFolderInFirestore(folderId, updateData);

      expect(result).toBeNull();
    });
  });

  describe('softRemoveMoldFolder', () => {
    it('should successfully soft delete a mold folder', async () => {
      const folderId = 'test-folder-id';
      const mockWriteResult = { writeTime: Timestamp.now() };

      mockMoldFolderRepository.softDeleteMoldFolder.mockResolvedValue(mockWriteResult as any);

      await moldFolderService.softRemoveMoldFolder(folderId);

      expect(mockMoldFolderRepository.softDeleteMoldFolder).toHaveBeenCalledWith(folderId);
    });

    it('should handle soft delete failure gracefully', async () => {
      const folderId = 'test-folder-id';

      mockMoldFolderRepository.softDeleteMoldFolder.mockResolvedValue(null);

      // Should not throw - errors are logged
      await expect(moldFolderService.softRemoveMoldFolder(folderId)).resolves.not.toThrow();
    });
  });

  describe('removeMoldFolder', () => {
    it('should successfully delete a mold folder permanently', async () => {
      const folderId = 'test-folder-id';
      const mockWriteResult = { writeTime: Timestamp.now() };

      mockMoldFolderRepository.deleteMoldFolder.mockResolvedValue(mockWriteResult as any);

      await moldFolderService.removeMoldFolder(folderId);

      expect(mockMoldFolderRepository.deleteMoldFolder).toHaveBeenCalledWith(folderId);
    });

    it('should handle delete failure gracefully', async () => {
      const folderId = 'test-folder-id';

      mockMoldFolderRepository.deleteMoldFolder.mockResolvedValue(null);

      // Should not throw - errors are logged
      await expect(moldFolderService.removeMoldFolder(folderId)).resolves.not.toThrow();
    });
  });
});