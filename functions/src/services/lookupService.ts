import {getFirestore} from "firebase-admin/firestore";
import {devLog} from "../utils/dev";
import {FirestoreCollection, getCollectionName} from "../types/models/firestoreCollections";
import {firebase} from "../configs/firebase";

export interface LookupResult {
  moldId: string;
  moldName: string;
  confidence: number; // 0–100%
}

/**
 * Performs mold lookup based on reported symptoms, signs, and characteristics
 * Uses Set-based matching for O(1) lookups per reported item
 *
 * @param reportedSymptoms - Array of reported symptoms (case-insensitive)
 * @param reportedSigns - Array of reported signs (case-insensitive)
 * @param reportedCharacteristics - Array of reported characteristics (case-insensitive)
 * @returns Array of molds sorted by confidence DESC, top 10 results
 */
export async function performMoldLookup(
  reportedSymptoms: string[] = [],
  reportedSigns: string[] = [],
  reportedCharacteristics: string[] = []
): Promise<LookupResult[]> {
  try {
    // 1. Fetch all molds from Firestore
    const db = getFirestore(firebase);
    const moldsCollection = getCollectionName(FirestoreCollection.MOLDS);
    console.log(`[performMoldLookup] Fetching molds from collection: ${moldsCollection}`);
    devLog(`[performMoldLookup] Fetching molds from collection: ${moldsCollection}`);

    const moldsSnapshot = await db.collection(moldsCollection).get();
    console.log(`[performMoldLookup] Found ${moldsSnapshot.docs.length} molds in database`);
    devLog(`[performMoldLookup] Found ${moldsSnapshot.docs.length} molds in database`);

    const molds = moldsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<any>;

    if (molds.length === 0) {
      console.log("[performMoldLookup] ⚠️ No molds found in database");
      devLog("[performMoldLookup] ⚠️ No molds found in database");
      return [];
    }

    // Log first few molds for debugging
    console.log(`[performMoldLookup] First mold: ${molds[0]?.name || "N/A"} with ${((molds[0] as any)?.symptoms || []).length} symptoms`);
    devLog(`[performMoldLookup] First mold: ${molds[0]?.name || "N/A"} with ${((molds[0] as any)?.symptoms || []).length} symptoms`);

    // 2. Normalize input (lowercase for case-insensitive matching)
    const normalizedSymptoms = reportedSymptoms.map((s) => s.toLowerCase());
    const normalizedSigns = reportedSigns.map((s) => s.toLowerCase());
    const normalizedCharacteristics = reportedCharacteristics.map((c) =>
      c.toLowerCase()
    );
    const totalReported =
      normalizedSymptoms.length +
      normalizedSigns.length +
      normalizedCharacteristics.length;

    const inputStats = `symptoms: ${normalizedSymptoms.length}, signs: ${normalizedSigns.length}, characteristics: ${normalizedCharacteristics.length}`;
    console.log(`[performMoldLookup] Input: ${inputStats} (total: ${totalReported})`);
    devLog(`[performMoldLookup] Input: ${inputStats} (total: ${totalReported})`);

    if (totalReported === 0) {
      console.log("[performMoldLookup] ⚠️ No reported items provided");
      devLog("[performMoldLookup] ⚠️ No reported items provided");
      return [];
    }

    // 3. Score each mold
    const results = molds.map((mold: any) => {
      // Create sets for O(1) lookup
      const moldSymptomSet = new Set(
        (mold.symptoms || []).map((s: string) => s.toLowerCase())
      );
      const moldSignSet = new Set(
        (mold.signs || []).map((s: string) => s.toLowerCase())
      );
      const moldCharacteristicSet = new Set(
        (mold.characteristics || []).map((c: string) => c.toLowerCase())
      );

      // Count matches
      let matches = 0;
      matches += normalizedSymptoms.filter((s) => moldSymptomSet.has(s)).length;
      matches += normalizedSigns.filter((s) => moldSignSet.has(s)).length;
      matches += normalizedCharacteristics.filter((c) =>
        moldCharacteristicSet.has(c)
      ).length;

      const confidence = Math.round((matches / totalReported) * 100);

      return {
        moldId: mold.id,
        moldName: mold.name,
        confidence: Math.max(0, confidence), // ensure non-negative
      };
    });

    // 4. Filter and sort (only keep > 0% confidence)
    const filtered = results.filter((r) => r.confidence > 0);
    const sorted = filtered.sort((a, b) => b.confidence - a.confidence);

    console.log(`[performMoldLookup] ✅ Found ${sorted.length} matches from ${molds.length} molds`);
    devLog(
      `[performMoldLookup] ✅ Found ${sorted.length} matches from ${molds.length} molds`
    );
    if (sorted.length > 0) {
      console.log(`[performMoldLookup] Top result: ${sorted[0].moldName} (${sorted[0].confidence}%)`);
      devLog(`[performMoldLookup] Top result: ${sorted[0].moldName} (${sorted[0].confidence}%)`);
    }

    // Return top 10
    return sorted.slice(0, 10);
  } catch (error) {
    console.log("[performMoldLookup] ❌ Error: " + String(error));
    devLog("[performMoldLookup] ❌ Error: " + String(error), "LOOKUP_ERROR");
    console.log(error);
    devLog(error);
    return [];
  }
}
