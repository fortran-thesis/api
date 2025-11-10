import {describe, it, expect, jest, beforeEach} from "@jest/globals";
import * as cultivationAnalysisService from "../../../src/services/cultivationAnalysisService";
import {cultivationModel} from "../../../src/configs/gemini";

// Mock Gemini model
jest.mock("../../../src/configs/gemini", () => ({
  cultivationModel: {
    generateContent: jest.fn(),
  },
}));

jest.mock("../../../src/utils/dev");

const mockCultivationModel = cultivationModel as jest.Mocked<
  typeof cultivationModel
>;

describe("cultivationAnalysisService (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("analyzeCultivationImage - vivo", () => {
    it("should successfully analyze in vivo cultivation image", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      const mockGeminiResponse = JSON.stringify({
        lesion_size: 15,
        lesion_color: "dark brown",
        additional_info: "Clear fungal lesion with defined borders",
        confidence: "85%",
      });

      mockCultivationModel.generateContent.mockResolvedValue({
        response: {
          text: () => mockGeminiResponse,
        },
      } as any);

      const result = await cultivationAnalysisService.analyzeCultivationImage(
        mockImageBuffer,
        "vivo"
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe("vivo");
      expect(result?.characteristics).toEqual({
        lesion_size: 15,
        lesion_color: "dark brown",
      });
      expect(result?.confidence).toBe("85%");
      expect(mockCultivationModel.generateContent).toHaveBeenCalledTimes(1);
    });

    it("should handle unrecognizable vivo image", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      const mockGeminiResponse = JSON.stringify({
        lesion_size: 0,
        lesion_color: "unrecognizable",
        additional_info: "Image quality insufficient",
        confidence: "0%",
      });

      mockCultivationModel.generateContent.mockResolvedValue({
        response: {
          text: () => mockGeminiResponse,
        },
      } as any);

      const result = await cultivationAnalysisService.analyzeCultivationImage(
        mockImageBuffer,
        "vivo"
      );

      expect(result).toBeDefined();
      expect(result?.characteristics).toEqual({
        lesion_size: 0,
        lesion_color: "unrecognizable",
      });
    });
  });

  describe("analyzeCultivationImage - vitro", () => {
    it("should successfully analyze in vitro cultivation image", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      const mockGeminiResponse = JSON.stringify({
        colony_diameter: 25,
        colony_color: "white with green spores",
        additional_info: "Healthy colony growth with visible sporulation",
        confidence: "90%",
      });

      mockCultivationModel.generateContent.mockResolvedValue({
        response: {
          text: () => mockGeminiResponse,
        },
      } as any);

      const result = await cultivationAnalysisService.analyzeCultivationImage(
        mockImageBuffer,
        "vitro"
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe("vitro");
      expect(result?.characteristics).toEqual({
        colony_diameter: 25,
        colony_color: "white with green spores",
      });
      expect(result?.confidence).toBe("90%");
    });

    it("should handle Gemini response with markdown code blocks", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      const mockGeminiResponse = "```json\n" +
        JSON.stringify({
          colony_diameter: 30,
          colony_color: "gray",
          additional_info: "Test",
          confidence: "80%",
        }) +
        "\n```";

      mockCultivationModel.generateContent.mockResolvedValue({
        response: {
          text: () => mockGeminiResponse,
        },
      } as any);

      const result = await cultivationAnalysisService.analyzeCultivationImage(
        mockImageBuffer,
        "vitro"
      );

      expect(result).toBeDefined();
      expect(result?.characteristics).toEqual({
        colony_diameter: 30,
        colony_color: "gray",
      });
    });
  });

  describe("analyzeCultivationImage - error handling", () => {
    it("should return null when Gemini API fails", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");

      mockCultivationModel.generateContent.mockRejectedValue(
        new Error("API Error")
      );

      const result = await cultivationAnalysisService.analyzeCultivationImage(
        mockImageBuffer,
        "vivo"
      );

      expect(result).toBeNull();
    });

    it("should return null when response is invalid JSON", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");

      mockCultivationModel.generateContent.mockResolvedValue({
        response: {
          text: () => "invalid json response",
        },
      } as any);

      const result = await cultivationAnalysisService.analyzeCultivationImage(
        mockImageBuffer,
        "vitro"
      );

      expect(result).toBeNull();
    });
  });
});
