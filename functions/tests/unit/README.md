# Unit Testing Guide

This directory contains **unit tests** for the API. Unit tests run in isolation with mocked dependencies—no Firebase Emulator, Redis, or Mailhog required.

## Directory Structure

```
tests/
├── unit/                    # ← NEW: Pure unit tests (fast, no external services)
│   ├── services/
│   ├── controllers/
│   ├── repositories/
│   ├── middlewares/
│   ├── utils/
│   └── lib/
└── [other tests]/           # ← OLD: Integration tests (require emulators)
```

## Running Tests

```bash
# Run only unit tests (fast, no setup needed)
npm run test:unit

# Run only integration tests (slow, needs Firebase Emulator)
npm run test:integration

# Run all tests
npm test
```

## CI/CD

- **Unit tests**: Run automatically on push/PR via `.github/workflows/unit-test.yml`
- **Integration tests**: Currently disabled (see `.github/workflows/test.yml`)

## Writing Unit Tests

### Template Structure

```typescript
import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as serviceToTest from "../../../src/services/yourService";
import * as dependency from "../../../src/repositories/yourRepository";

// Mock all external dependencies
jest.mock("../../../src/repositories/yourRepository");
jest.mock("../../../src/utils/dev");
jest.mock("../../../src/configs/redis", () => ({
  redis: {},
  redisReady: Promise.resolve(),
}));

const mockDependency = dependency as jest.Mocked<typeof dependency>;

describe("yourService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("yourFunction", () => {
    it("should do something successfully", async () => {
      // Arrange
      mockDependency.someMethod.mockResolvedValue({...});

      // Act
      const result = await serviceToTest.yourFunction(...);

      // Assert
      expect(result).toBeDefined();
      expect(mockDependency.someMethod).toHaveBeenCalledWith(...);
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      mockDependency.someMethod.mockRejectedValue(new Error("Test error"));

      // Act
      const result = await serviceToTest.yourFunction(...);

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

### Example Tests

Check these files for reference:
- `tests/unit/services/cultivationAnalysisService.test.ts` - Mocking Gemini AI
- `tests/unit/services/mycologistService.test.ts` - Mocking auth service
- `tests/unit/services/auditLogService.test.ts` - Mocking repository + Firestore

### Key Principles

1. **Mock everything external** - Firebase, Redis, HTTP calls, file system
2. **Test one function at a time** - Focus on the unit under test
3. **Test both success and failure paths** - Happy path + error handling
4. **Fast execution** - Unit tests should run in milliseconds
5. **No side effects** - Tests shouldn't modify real data or depend on each other

## Services Missing Tests

The following services need unit tests created:

- [ ] `flagReportService.ts`
- [ ] `investigationService.ts`
- [ ] `moldipediaService.ts`
- [ ] `moldReportService.ts`
- [ ] `monitoredMoldService.ts`
- [ ] `reportService.ts`
- [ ] `scannedMoldService.ts`
- [ ] `systemRequestService.ts`

## Next Steps

1. Copy one of the example tests as a template
2. Replace the service/repository imports
3. Mock the dependencies
4. Write test cases for success and error scenarios
5. Run `npm run test:unit` to verify
6. Commit and push - CI will run automatically!

---

**Note:** Integration tests in the root `tests/` directory are legacy and require Firebase Emulator setup. Focus on unit tests for new development.
