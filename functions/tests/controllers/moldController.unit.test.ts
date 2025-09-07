import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import * as moldController from '../../src/controllers/moldController';
import * as moldService from '../../src/services/moldService';
import * as responseUtils from '../../src/utils/response';
import * as storageLib from '../../src/lib/storage';
import * as loggingUtils from '../../src/utils/logging';
import { AuditAction } from '../../src/types/enums';

// Mock all external dependencies
jest.mock('../../src/services/moldService');
jest.mock('../../src/utils/response');
jest.mock('../../src/lib/storage');
jest.mock('../../src/utils/logging');
jest.mock('../../src/utils/dev');
jest.mock('../../src/configs/redis', () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockMoldService = moldService as jest.Mocked<typeof moldService>;
const mockResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>;
const mockStorageLib = storageLib as jest.Mocked<typeof storageLib>;
const mockLoggingUtils = loggingUtils as jest.Mocked<typeof loggingUtils>;

describe('moldController (unit)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      params: {},
      body: {},
      query: {},
      files: [],
      user: {
        id: 'test-user-id',
        user: {
          username: 'testuser',
          role: 'USER' as any,
          is_banned: false,
        },
        details: {
          email: 'test@example.com',
        },
      },
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock response utilities
    mockResponseUtils.sendSuccess.mockReturnValue(undefined as any);
    mockResponseUtils.sendError.mockReturnValue(undefined as any);
    mockResponseUtils.defaultError.mockReturnValue(undefined as any);
  });

  describe('createMold', () => {
    it('should successfully create a mold with photos', async () => {
      const moldDetails = {
        name: 'Test Mold',
        description: 'A test mold',
        growth_stage: 'Early',
      };

      const mockFiles = [
        { originalname: 'photo1.jpg', buffer: Buffer.from('photo1') },
        { originalname: 'photo2.jpg', buffer: Buffer.from('photo2') },
      ] as Express.Multer.File[];

      const mockUploadedUrls = ['http://example.com/photo1.jpg', 'http://example.com/photo2.jpg'];
      const mockCreatedMold = {
        id: 'test-mold-id',
        ...moldDetails,
        photo_url: mockUploadedUrls,
      };

      mockReq.body = { details: moldDetails };
      mockReq.files = mockFiles;

      mockStorageLib.uploadFiles.mockResolvedValue(mockUploadedUrls);
      mockMoldService.addMoldToFirestore.mockResolvedValue(mockCreatedMold as any);
      mockLoggingUtils.createLog.mockResolvedValue(undefined);

      await moldController.createMold(mockReq as Request, mockRes as Response);

      expect(mockStorageLib.uploadFiles).toHaveBeenCalledWith(mockFiles, moldDetails.name);
      expect(mockMoldService.addMoldToFirestore).toHaveBeenCalledWith({
        ...moldDetails,
        photo_url: mockUploadedUrls,
      });
      expect(mockLoggingUtils.createLog).toHaveBeenCalledWith(
        'test-user-id',
        'USER',
        AuditAction.ADD_MOLD,
        'Created mold: Test Mold',
        'test-mold-id'
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(mockRes, mockCreatedMold);
    });

    it('should handle mold creation failure', async () => {
      const moldDetails = {
        name: 'Test Mold',
        description: 'A test mold',
        growth_stage: 'Early',
      };

      mockReq.body = { details: moldDetails };
      mockReq.files = [];

      mockStorageLib.uploadFiles.mockResolvedValue([]);
      mockMoldService.addMoldToFirestore.mockResolvedValue(null);

      await moldController.createMold(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        'Failed to retrieve mold',
        404
      );
    });

    it('should handle service errors', async () => {
      const moldDetails = {
        name: 'Test Mold',
        description: 'A test mold',
        growth_stage: 'Early',
      };

      mockReq.body = { details: moldDetails };
      mockReq.files = [];

      mockStorageLib.uploadFiles.mockRejectedValue(new Error('Upload failed'));

      await moldController.createMold(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.defaultError).toHaveBeenCalledWith(mockRes);
    });
  });

  describe('getAllMolds', () => {
    it('should return paginated molds with default parameters', async () => {
      const mockPaginatedResult = {
        snapshot: [
          {
            id: 'mold1',
            name: 'Mold 1',
            description: 'Test mold 1',
            growth_stage: 'Early',
            photo_url: ['http://example.com/photo1.jpg'],
          },
          {
            id: 'mold2',
            name: 'Mold 2',
            description: 'Test mold 2',
            growth_stage: 'Late',
            photo_url: ['http://example.com/photo2.jpg'],
          },
        ],
        nextPageToken: null,
      };

      mockReq.query = {};
      mockMoldService.retrieveAllMolds.mockResolvedValue(mockPaginatedResult as any);

      await moldController.getAllMolds(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveAllMolds).toHaveBeenCalledWith(10, undefined);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(mockRes, mockPaginatedResult);
    });

    it('should use custom limit and pageToken', async () => {
      const mockPaginatedResult = {
        snapshot: [],
        nextPageToken: null,
      };

      mockReq.query = { limit: '5', pageToken: 'token123' };
      mockMoldService.retrieveAllMolds.mockResolvedValue(mockPaginatedResult as any);

      await moldController.getAllMolds(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveAllMolds).toHaveBeenCalledWith(5, 'token123');
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(mockRes, mockPaginatedResult);
    });

    it('should return 404 when no molds found', async () => {
      mockReq.query = {};
      mockMoldService.retrieveAllMolds.mockResolvedValue(null);

      await moldController.getAllMolds(mockReq as Request, mockRes as Response);

      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        'Failed to retrieve molds',
        404
      );
    });
  });

  describe('getMoldById', () => {
    it('should return mold when found', async () => {
      const moldId = 'test-mold-id';
      const mockMold = {
        id: moldId,
        name: 'Test Mold',
        description: 'A test mold',
        growth_stage: 'Early',
        photo_url: ['http://example.com/photo.jpg'],
      };

      mockReq.params = { id: moldId };
      mockMoldService.retrieveMoldById.mockResolvedValue(mockMold as any);

      await moldController.getMoldById(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveMoldById).toHaveBeenCalledWith(moldId);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(mockRes, mockMold);
    });

    it('should return 404 when mold not found', async () => {
      const moldId = 'nonexistent-mold';
      mockReq.params = { id: moldId };
      mockMoldService.retrieveMoldById.mockResolvedValue(null);

      await moldController.getMoldById(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveMoldById).toHaveBeenCalledWith(moldId);
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        'Failed to retrieve mold',
        404
      );
    });
  });

  describe('getMoldByName', () => {
    it('should return mold when found by name', async () => {
      const moldName = 'Test Mold';
      const mockMold = {
        id: 'test-mold-id',
        name: moldName,
        description: 'A test mold',
        growth_stage: 'Early',
        photo_url: ['http://example.com/photo.jpg'],
      };

      mockReq.params = { name: moldName };
      mockMoldService.retrieveMoldByName.mockResolvedValue(mockMold as any);

      await moldController.getMoldByName(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveMoldByName).toHaveBeenCalledWith(moldName);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(mockRes, mockMold);
    });

    it('should return 404 when mold not found by name', async () => {
      const moldName = 'Nonexistent Mold';
      mockReq.params = { name: moldName };
      mockMoldService.retrieveMoldByName.mockResolvedValue(null);

      await moldController.getMoldByName(mockReq as Request, mockRes as Response);

      expect(mockMoldService.retrieveMoldByName).toHaveBeenCalledWith(moldName);
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        'Failed to retrieve mold',
        404
      );
    });
  });

  describe('patchMold', () => {
    it('should successfully update a mold', async () => {
      const moldId = 'test-mold-id';
      const updateData = { name: 'Updated Mold Name' };
      const updatedMold = {
        id: moldId,
        name: 'Updated Mold Name',
        description: 'A test mold',
        growth_stage: 'Early',
        photo_url: ['http://example.com/photo.jpg'],
      };

      mockReq.params = { id: moldId };
      mockReq.body = { details: updateData };
      mockMoldService.updateMoldInFirestore.mockResolvedValue(updatedMold as any);

      await moldController.patchMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.updateMoldInFirestore).toHaveBeenCalledWith(moldId, updateData);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(mockRes, 'Successfully updated mold.');
    });

    it('should return error when update fails', async () => {
      const moldId = 'test-mold-id';
      const updateData = { name: 'Updated Mold Name' };

      mockReq.params = { id: moldId };
      mockReq.body = { details: updateData };
      mockMoldService.updateMoldInFirestore.mockResolvedValue(null);

      await moldController.patchMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.updateMoldInFirestore).toHaveBeenCalledWith(moldId, updateData);
      expect(mockResponseUtils.sendError).toHaveBeenCalledWith(
        mockRes,
        'Failed to update mold',
        404
      );
    });
  });

  describe('softDeleteMold', () => {
    it('should successfully soft delete a mold', async () => {
      const moldId = 'test-mold-id';

      mockReq.params = { id: moldId };
      mockMoldService.softRemoveMold.mockResolvedValue(undefined);

      await moldController.softDeleteMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.softRemoveMold).toHaveBeenCalledWith(moldId);
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        'Successfully soft deleted mold.'
      );
    });
  });

  describe('deleteMold', () => {
    it('should successfully delete a mold permanently', async () => {
      const moldId = 'test-mold-id';

      mockReq.params = { id: moldId };
      mockMoldService.removeMold.mockResolvedValue(undefined);

      await moldController.deleteMold(mockReq as Request, mockRes as Response);

      expect(mockMoldService.removeMold).toHaveBeenCalledWith(moldId);
      expect(mockLoggingUtils.createLog).toHaveBeenCalledWith(
        'test-user-id',
        'USER',
        AuditAction.EDIT_MOLD,
        `Soft deleted mold: ${moldId}`,
        moldId
      );
      expect(mockResponseUtils.sendSuccess).toHaveBeenCalledWith(
        mockRes,
        'Successfully deleted mold'
      );
    });
  });
});