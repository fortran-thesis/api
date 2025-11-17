import {getMoldCasePriorityBreakdown} from "../../../src/services/moldCaseService";
import {countCasesByPriority} from "../../../src/repositories/moldCaseRepository";
import {getCachedItem, cacheItem} from "../../../src/utils/cacheManager";
import {devLog} from "../../../src/utils/dev";

jest.mock("../../../src/repositories/moldCaseRepository");
jest.mock("../../../src/utils/cacheManager");
jest.mock("../../../src/utils/dev");

const mockCountCasesByPriority = countCasesByPriority as jest.MockedFunction<typeof countCasesByPriority>;
const mockGetCachedItem = getCachedItem as jest.MockedFunction<typeof getCachedItem>;
const mockCacheItem = cacheItem as jest.MockedFunction<typeof cacheItem>;

describe("getMoldCasePriorityBreakdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return priority breakdown with all counts", async () => {
    const mockCounts = {low: 25, medium: 18, high: 7};

    mockGetCachedItem.mockResolvedValueOnce(null);
    mockCountCasesByPriority.mockResolvedValueOnce(mockCounts);
    mockCacheItem.mockResolvedValueOnce(undefined);

    const result = await getMoldCasePriorityBreakdown();

    expect(result).toEqual(mockCounts);
    expect(mockGetCachedItem).toHaveBeenCalledWith("mold-cases", "priority-breakdown");
    expect(mockCountCasesByPriority).toHaveBeenCalled();
    expect(mockCacheItem).toHaveBeenCalledWith("mold-cases", "priority-breakdown", mockCounts, {ttl: 3600});
  });

  it("should use cached result if available", async () => {
    const cachedResult = {low: 25, medium: 18, high: 7};

    mockGetCachedItem.mockResolvedValueOnce(cachedResult);

    const result = await getMoldCasePriorityBreakdown();

    expect(result).toEqual(cachedResult);
    expect(mockGetCachedItem).toHaveBeenCalledWith("mold-cases", "priority-breakdown");
    expect(mockCountCasesByPriority).not.toHaveBeenCalled();
    expect(mockCacheItem).not.toHaveBeenCalled();
  });

  it("should return null if countCasesByPriority fails", async () => {
    mockGetCachedItem.mockResolvedValueOnce(null);
    mockCountCasesByPriority.mockResolvedValueOnce(null);

    const result = await getMoldCasePriorityBreakdown();

    expect(result).toBeNull();
    expect(mockCacheItem).not.toHaveBeenCalled();
  });

  it("should return zero counts for all priorities", async () => {
    const emptyCounts = {low: 0, medium: 0, high: 0};

    mockGetCachedItem.mockResolvedValueOnce(null);
    mockCountCasesByPriority.mockResolvedValueOnce(emptyCounts);
    mockCacheItem.mockResolvedValueOnce(undefined);

    const result = await getMoldCasePriorityBreakdown();

    expect(result).toEqual(emptyCounts);
    expect(mockCacheItem).toHaveBeenCalledWith("mold-cases", "priority-breakdown", emptyCounts, {ttl: 3600});
  });

  it("should handle errors gracefully and return null", async () => {
    mockGetCachedItem.mockRejectedValueOnce(new Error("Cache error"));

    const result = await getMoldCasePriorityBreakdown();

    expect(result).toBeNull();
    expect(devLog).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should cache result with 1 hour TTL", async () => {
    const mockCounts = {low: 25, medium: 18, high: 7};

    mockGetCachedItem.mockResolvedValueOnce(null);
    mockCountCasesByPriority.mockResolvedValueOnce(mockCounts);
    mockCacheItem.mockResolvedValueOnce(undefined);

    await getMoldCasePriorityBreakdown();

    expect(mockCacheItem).toHaveBeenCalledWith(
      "mold-cases",
      "priority-breakdown",
      mockCounts,
      {ttl: 3600}
    );
  });
});
