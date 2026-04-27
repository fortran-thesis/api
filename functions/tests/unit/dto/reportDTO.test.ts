import {describe, it, expect} from "@jest/globals";
import {Timestamp} from "firebase-admin/firestore";
import {AssignMoldReportSchema} from "../../../src/dto/reportDTO";

const nextWeekendDateIso = (): string => {
  const today = new Date();
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
  const weekendDate = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() + daysUntilSaturday,
    12,
    0,
    0,
    0
  ));

  return weekendDate.toISOString();
};

describe("AssignMoldReportSchema", () => {
  it("accepts a weekend end_date now that the 3-day/weekend gate is removed", () => {
    const result = AssignMoldReportSchema.safeParse({
      assigned_mycologist_id: "myc-1",
      end_date: nextWeekendDateIso(),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.end_date).toBeInstanceOf(Timestamp);
    }
  });

  it("still accepts payloads without an end_date", () => {
    const result = AssignMoldReportSchema.safeParse({
      assigned_mycologist_id: "myc-1",
    });

    expect(result.success).toBe(true);
  });
});