import {getCombinedTotalCounts} from "../../../src/services/moldCaseService";
import {getRoleCounts} from "../../../src/services/userService";
import {getDisabledCounts} from "../../../src/services/userService";
import {getMoldReportStatusCounts} from "../../../src/services/moldReportService";
import {countCasesByPriority} from "../../../src/repositories/moldCaseRepository";
import {getCachedItem, cacheItem} from "../../../src/utils/cacheManager";
import {devLog} from "../../../src/utils/dev";

jest.mock("../../../src/services/userService");
jest.mock("../../../src/services/moldReportService");
jest.mock("../../../src/repositories/moldCaseRepository");
jest.mock("../../../src/utils/cacheManager");
jest.mock("../../../src/utils/dev");

const mockGetRoleCounts = getRoleCounts as jest.MockedFunction<typeof getRoleCounts>;
const mockGetDisabledCounts = getDisabledCounts as jest.MockedFunction<typeof getDisabledCounts>;
const mockGetMoldReportStatusCounts = getMoldReportStatusCounts as jest.MockedFunction<typeof getMoldReportStatusCounts>;
const mockCountCasesByPriority = countCasesByPriority as jest.MockedFunction<typeof countCasesByPriority>;
const mockGetCachedItem = getCachedItem as jest.MockedFunction<typeof getCachedItem>;
const mockCacheItem = cacheItem as jest.MockedFunction<typeof cacheItem>;

describe("getCombinedTotalCounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return combined counts with all data available", async () => {
    const mockRoleCounts = {farmer: 10, mycologist: 5, curator: 3, admin: 1};
    const mockUserStatus = {active: 15, inactive: 4};
    const mockReportCounts = {total: 50, pending: 10, in_progress: 20, resolved: 15, closed: 5};
    const mockCaseCounts = {low: 25, medium: 18, high: 7};

    mockGetCachedItem.mockResolvedValueOnce(null);
    mockGetRoleCounts.mockResolvedValueOnce(mockRoleCounts);
    mockGetDisabledCounts.mockResolvedValueOnce(mockUserStatus);
    mockGetMoldReportStatusCounts.mockResolvedValueOnce(mockReportCounts);
    mockCountCasesByPriority.mockResolvedValueOnce(mockCaseCounts);
    mockCacheItem.mockResolvedValueOnce(undefined);

    const result = await getCombinedTotalCounts();

    expect(result).toEqual({
      users: mockRoleCounts,
      userStatus: mockUserStatus,
      moldReports: mockReportCounts,
      moldCases: mockCaseCounts,
    });
    expect(mockGetCachedItem).toHaveBeenCalledWith("dashboard", "combined-total-counts");
    expect(mockGetRoleCounts).toHaveBeenCalled();
    expect(mockGetDisabledCounts).toHaveBeenCalled();
    expect(mockGetMoldReportStatusCounts).toHaveBeenCalled();
    expect(mockCountCasesByPriority).toHaveBeenCalled();
    expect(mockCacheItem).toHaveBeenCalledWith("dashboard", "combined-total-counts", expect.any(Object), {ttl: 3600});
  });

  it("should use cached result if available", async () => {
    const cachedResult = {
      users: {farmer: 10, mycologist: 5},
      userStatus: {active: 15, inactive: 4},
      moldReports: {total: 50, pending: 10, in_progress: 20, resolved: 15, closed: 5},
      moldCases: {low: 25, medium: 18, high: 7},
    };

    mockGetCachedItem.mockResolvedValueOnce(cachedResult);

    const result = await getCombinedTotalCounts();

    expect(result).toEqual(cachedResult);
    expect(mockGetCachedItem).toHaveBeenCalledWith("dashboard", "combined-total-counts");
    expect(mockGetRoleCounts).not.toHaveBeenCalled();
    expect(mockGetDisabledCounts).not.toHaveBeenCalled();
    expect(mockGetMoldReportStatusCounts).not.toHaveBeenCalled();
    expect(mockCountCasesByPriority).not.toHaveBeenCalled();
  });

  it("should return null if any service fails", async () => {
    mockGetCachedItem.mockResolvedValueOnce(null);
    mockGetRoleCounts.mockResolvedValueOnce(null);
    mockGetDisabledCounts.mockResolvedValueOnce({active: 15, inactive: 4});
    mockGetMoldReportStatusCounts.mockResolvedValueOnce({total: 50, pending: 10, in_progress: 20, resolved: 15, closed: 5});
    mockCountCasesByPriority.mockResolvedValueOnce({low: 25, medium: 18, high: 7});
    mockCacheItem.mockResolvedValueOnce(undefined);

    const result = await getCombinedTotalCounts();

    expect(result).toEqual({
      users: null,
      userStatus: {active: 15, inactive: 4},
      moldReports: {total: 50, pending: 10, in_progress: 20, resolved: 15, closed: 5},
      moldCases: {low: 25, medium: 18, high: 7},
    });
  });

  it("should handle errors gracefully and return null", async () => {
    mockGetCachedItem.mockRejectedValueOnce(new Error("Cache error"));

    const result = await getCombinedTotalCounts();

    expect(result).toBeNull();
    expect(devLog).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should cache result with 1 hour TTL", async () => {
    const mockRoleCounts = {farmer: 10, mycologist: 5, curator: 3, admin: 1};
    const mockUserStatus = {active: 15, inactive: 4};
    const mockReportCounts = {total: 50, pending: 10, in_progress: 20, resolved: 15, closed: 5};
    const mockCaseCounts = {low: 25, medium: 18, high: 7};

    mockGetCachedItem.mockResolvedValueOnce(null);
    mockGetRoleCounts.mockResolvedValueOnce(mockRoleCounts);
    mockGetDisabledCounts.mockResolvedValueOnce(mockUserStatus);
    mockGetMoldReportStatusCounts.mockResolvedValueOnce(mockReportCounts);
    mockCountCasesByPriority.mockResolvedValueOnce(mockCaseCounts);
    mockCacheItem.mockResolvedValueOnce(undefined);

    await getCombinedTotalCounts();

    expect(mockCacheItem).toHaveBeenCalledWith(
      "dashboard",
      "combined-total-counts",
      {
        users: mockRoleCounts,
        userStatus: mockUserStatus,
        moldReports: mockReportCounts,
        moldCases: mockCaseCounts,
      },
      {ttl: 3600}
    );
  });
});
