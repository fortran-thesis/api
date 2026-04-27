import {describe, it, expect, beforeAll, afterAll, beforeEach, jest} from "@jest/globals";
import * as authLib from "../../src/lib/auth";
import {
  apiPath,
  cleanupEmulators,
  createCuratorUser,
  createTestUser,
  getDocument,
  getTestAgent,
  seedDocument,
  TestUser,
} from "./helpers";

jest.mock("../../src/lib/auth", () => {
  const actual = jest.requireActual("../../src/lib/auth");
  return {
    ...actual,
    getAuthUserNamesByIds: jest.fn(),
  };
});

const getAuthUserNamesByIdsMock = authLib.getAuthUserNamesByIds as jest.MockedFunction<
  typeof authLib.getAuthUserNamesByIds
>;

const seedCase = async (
  reporterId: string,
  mycologistId: string,
  name: string,
  overrides: Record<string, unknown> = {}
): Promise<string> => {
  return seedDocument("mold_cases", {
    user_id: reporterId,
    mycologist_id: mycologistId,
    name,
    priority: "medium",
    is_archived: false,
    start_date: new Date(),
    end_date: new Date(),
    ...overrides,
  });
};

describe("Mold case rehydration integration", () => {
  let mycologist: TestUser;
  let batchMycologist: TestUser;
  let reporter: TestUser;
  let batchReporters: TestUser[] = [];

  let userNameCaseId: string;
  let moldNameCaseId: string;
  let fallbackCaseId: string;
  let initialObsCaseId: string;
  let finalizeCaseId: string;
  let finalizeReportId: string;

  beforeAll(async () => {
    await cleanupEmulators();

    [mycologist, batchMycologist, reporter] = await Promise.all([
      createCuratorUser(`curator-${Date.now()}@test.com`),
      createCuratorUser(`batch-curator-${Date.now()}@test.com`),
      createTestUser({
        email: `reporter-${Date.now()}@test.com`,
        firstName: "Reporter",
        lastName: "One",
        username: `reporter_${Date.now()}`,
      }),
    ]);

    batchReporters = await Promise.all(
      Array.from({length: 5}, (_, index) =>
        createTestUser({
          email: `batch-reporter-${index}-${Date.now()}@test.com`,
          firstName: "Batch",
          lastName: String(index + 1),
          username: `batch_reporter_${index}_${Date.now()}`,
        })
      )
    );

    await seedDocument("molds", {
      name: "Aspergillus Niger",
    }, "mold-1");

    userNameCaseId = await seedCase(reporter.uid, mycologist.uid, "User Name Case", {
      mold_report_id: "report-user-name",
    });

    moldNameCaseId = await seedCase(reporter.uid, mycologist.uid, "Mold Name Case", {
      mold_report_id: "report-mold-name",
      final_verdict: {
        moldId: "mold-1",
        confidence: 90,
        verdict_timestamp: new Date(),
      },
    });

    fallbackCaseId = await seedCase(reporter.uid, mycologist.uid, "Fallback Case", {
      mold_report_id: "report-fallback",
      final_verdict: {
        moldId: null,
        confidence: 90,
        verdict_timestamp: new Date(),
        verdict_fallback_name: "Predicted X",
      },
    });

    initialObsCaseId = await seedCase(reporter.uid, mycologist.uid, "Initial Observation Case", {
      cultivation_details: {
        specimen_type: "Leaf",
        initial_observations: {
          symptoms: ["Yellowing"],
          microscopic_description: "Microscopic detail",
          macroscopic_description: "Macroscopic detail",
        },
      },
    });

    finalizeReportId = "report-finalize";
    await seedDocument("mold_reports", {
      case_name: "Finalize Case",
      user_id: reporter.uid,
      status: "pending",
    }, finalizeReportId);

    finalizeCaseId = await seedCase(reporter.uid, mycologist.uid, "Finalize Case", {
      mold_report_id: finalizeReportId,
      priority: "high",
    });

    await Promise.all(
      batchReporters.map((user, index) =>
        seedCase(user.uid, batchMycologist.uid, `Batch Case ${index + 1}`, {
          mold_report_id: `batch-report-${index + 1}`,
        })
      )
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getAuthUserNamesByIdsMock.mockReset();
  });

  afterAll(async () => {
    await cleanupEmulators();
  });

  it("rehydrates user_name on read without persisting it", async () => {
    const agent = getTestAgent();
    const res = await agent
      .get(apiPath(`/v1/mold-case/${userNameCaseId}`))
      .set("Authorization", `Bearer ${mycologist.token}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.user_name).toBe("Reporter One");

    const doc = await getDocument("mold_cases", userNameCaseId);
    expect(doc.data()?.user_name).toBeUndefined();
  });

  it("rehydrates final_verdict.moldName from the referenced mold", async () => {
    const agent = getTestAgent();
    const res = await agent
      .get(apiPath(`/v1/mold-case/${moldNameCaseId}`))
      .set("Authorization", `Bearer ${mycologist.token}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.final_verdict?.moldName).toBe("Aspergillus Niger");

    const doc = await getDocument("mold_cases", moldNameCaseId);
    expect(doc.data()?.final_verdict?.moldName).toBeUndefined();
  });

  it("rehydrates fallback verdict names when moldId is null", async () => {
    const agent = getTestAgent();
    const res = await agent
      .get(apiPath(`/v1/mold-case/${fallbackCaseId}`))
      .set("Authorization", `Bearer ${mycologist.token}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.final_verdict?.moldName).toBe("Predicted X");
  });

  it("persists verdicts without moldName while returning it in the response", async () => {
    const agent = getTestAgent();
    const res = await agent
      .patch(apiPath(`/v1/mold-case/${finalizeCaseId}/verdict`))
      .set("Authorization", `Bearer ${mycologist.token}`)
      .send({
        moldId: "mold-1",
        moldName: "Aspergillus Niger",
        confidence: 97,
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.final_verdict?.moldName).toBe("Aspergillus Niger");

    const doc = await getDocument("mold_cases", finalizeCaseId);
    expect(doc.data()?.final_verdict?.moldName).toBeUndefined();
    expect(doc.data()?.final_verdict?.verdict_fallback_name).toBeUndefined();

    const reportDoc = await getDocument("mold_reports", finalizeReportId);
    expect(reportDoc.data()?.status).toBe("resolved");
  });

  it("returns nested initial_observations on read", async () => {
    const agent = getTestAgent();
    const res = await agent
      .get(apiPath(`/v1/mold-case/${initialObsCaseId}`))
      .set("Authorization", `Bearer ${mycologist.token}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.cultivation_details?.initial_observations?.symptoms).toEqual([
      "Yellowing",
    ]);
    expect(res.body.data?.cultivation_details?.initial_observations?.microscopic_description).toBe(
      "Microscopic detail"
    );
  });

  it("batches auth name lookups for assigned case lists", async () => {
    const nameMap = new Map<string, string>([
      [batchMycologist.uid, "Batch Curator"],
      ...batchReporters.map((user, index) => [user.uid, `Batch Reporter ${index + 1}`] as [string, string]),
    ]);
    getAuthUserNamesByIdsMock.mockResolvedValue(nameMap);

    const agent = getTestAgent();
    const res = await agent
      .get(apiPath("/v1/mold-case/assigned"))
      .set("Authorization", `Bearer ${batchMycologist.token}`)
      .query({limit: 10})
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getAuthUserNamesByIdsMock).toHaveBeenCalledTimes(1);
    expect(res.body.data?.snapshot).toHaveLength(5);
    expect(res.body.data?.snapshot?.[0]?.user_name).toBeDefined();
    expect(res.body.data?.snapshot?.[0]?.mycologist_name).toBe("Batch Curator");
  });
});
