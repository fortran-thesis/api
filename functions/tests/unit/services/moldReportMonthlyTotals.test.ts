import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import {Timestamp} from "firebase-admin/firestore";
import * as moldReportService from "../../../src/services/moldReportService";

const mockCountReportsByDateRange = jest.fn() as jest.MockedFunction<any>;
const mockGetCachedItem = jest.fn() as jest.MockedFunction<any>;
const mockCacheItem = jest.fn() as jest.MockedFunction<any>;

jest.mock("../../../src/repositories/moldReportRepository", () => ({
  countReportsByDateRange: (...args: any[]) =>
    mockCountReportsByDateRange(...args),
}));

jest.mock("../../../src/utils/cacheManager", () => ({
  getCachedItem: (...args: any[]) => mockGetCachedItem(...args),
  cacheItem: (...args: any[]) => mockCacheItem(...args),
}));

jest.mock("../../../src/utils/dev");

describe("moldReportService.getMoldReportMonthlyTotals (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return monthly totals for all 12 months of the current year", async () => {
    // Mock cache miss
    mockGetCachedItem.mockResolvedValue(null);

    // Mock counts for each month (0-11)
    const monthlyCounts = [10, 15, 20, 12, 8, 18, 25, 30, 22, 14, 11, 9];
    mockCountReportsByDateRange.mockImplementation(() =>
      Promise.resolve(monthlyCounts[mockCountReportsByDateRange.mock.calls.length - 1])
    );

    const result = await moldReportService.getMoldReportMonthlyTotals(2025);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(12);
    expect(result![0].month).toContain("January");
    expect(result![0].total).toBe(10);
    expect(result![11].month).toContain("December");
    expect(result![11].total).toBe(9);

    // Should cache the result
    expect(mockCacheItem).toHaveBeenCalled();
  });

  it("should use cached result if available", async () => {
    const cachedData = [
      {month: "January 2025", total: 5},
      {month: "February 2025", total: 8},
    ];
    mockGetCachedItem.mockResolvedValue(cachedData);

    const result = await moldReportService.getMoldReportMonthlyTotals(2025);

    expect(result).toEqual(cachedData);
    // Should not call the counter since cache hit
    expect(mockCountReportsByDateRange).not.toHaveBeenCalled();
  });

  it("should return null on error", async () => {
    mockGetCachedItem.mockRejectedValue(new Error("Cache error"));

    const result = await moldReportService.getMoldReportMonthlyTotals(2025);

    expect(result).toBeNull();
  });

  it("should default to current year when year is not provided", async () => {
    mockGetCachedItem.mockResolvedValue(null);
    mockCountReportsByDateRange.mockResolvedValue(0);

    const result = await moldReportService.getMoldReportMonthlyTotals();

    expect(result).not.toBeNull();
    expect(result).toHaveLength(12);
    const currentYear = new Date().getFullYear();
    expect(result![0].month).toContain(currentYear.toString());
  });

  it("should return 0 for months with no reports", async () => {
    mockGetCachedItem.mockResolvedValue(null);
    mockCountReportsByDateRange.mockResolvedValue(0);

    const result = await moldReportService.getMoldReportMonthlyTotals(2025);

    expect(result).not.toBeNull();
    expect(result!.every((m) => m.total === 0)).toBe(true);
  });
});
