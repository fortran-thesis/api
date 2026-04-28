import {getFirestore} from "firebase-admin/firestore";
import {devLog} from "../utils/dev";
import {FirestoreCollection, getCollectionName} from "../types/models/firestoreCollections";
import {firebase} from "../configs/firebase";
import {cacheItem, getCachedItem} from "../utils/cacheManager";

const LOOKUP_CATALOG_RESOURCE = "mold-catalog";
const LOOKUP_CATALOG_KEY = "all";
const LOOKUP_CATALOG_TTL_SECONDS = 3600;

interface LookupCatalogEntry {
  moldId: string;
  moldName: string;
  moldNameNormalized: string;
  symptoms: string[];
  signs: string[];
  characteristics: string[];
  symptomLookup: Record<string, true>;
  signLookup: Record<string, true>;
  characteristicLookup: Record<string, true>;
}

export interface LookupResult {
  moldId: string;
  moldName: string;
  confidence: number; // 0–100%
}

const normalizeCatalogTerms = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];

  const normalized = values.map((value) => String(value).toLowerCase());
  return Array.from(new Set(normalized));
};

const toLookupMap = (values: string[]): Record<string, true> => {
  const lookup: Record<string, true> = {};

  values.forEach((value) => {
    lookup[value] = true;
  });

  return lookup;
};

const isMoldActive = (mold: Record<string, any>): boolean => {
  const deletedAt = mold?.metadata?.deleted_at;
  return deletedAt === null || deletedAt === undefined;
};

const toLookupCatalogEntry = (mold: Record<string, any>): LookupCatalogEntry => {
  const symptoms = normalizeCatalogTerms(mold.symptoms);
  const signs = normalizeCatalogTerms(mold.signs);
  const characteristics = normalizeCatalogTerms(mold.characteristics);
  const moldName = String(mold.name || "");

  return {
    moldId: String(mold.id || ""),
    moldName,
    moldNameNormalized: moldName.toLowerCase(),
    symptoms,
    signs,
    characteristics,
    symptomLookup: toLookupMap(symptoms),
    signLookup: toLookupMap(signs),
    characteristicLookup: toLookupMap(characteristics),
  };
};

const getLookupCatalog = async (): Promise<LookupCatalogEntry[]> => {
  const cached = await getCachedItem<LookupCatalogEntry[]>(
    LOOKUP_CATALOG_RESOURCE,
    LOOKUP_CATALOG_KEY
  );

  if (cached) {
    devLog(`[performMoldLookup] Cache hit for ${LOOKUP_CATALOG_RESOURCE}:item:${LOOKUP_CATALOG_KEY}`);
    return cached;
  }

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
  })) as Array<Record<string, any>>;

  const catalog = molds
    .filter((mold) => isMoldActive(mold))
    .map((mold) => toLookupCatalogEntry(mold));

  await cacheItem(
    LOOKUP_CATALOG_RESOURCE,
    LOOKUP_CATALOG_KEY,
    catalog,
    {ttl: LOOKUP_CATALOG_TTL_SECONDS}
  );

  devLog(`[performMoldLookup] Cached ${catalog.length} active molds for lookup`);
  return catalog;
};

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
  reportedCharacteristics: string[] = [],
  reportedMoldNames: string[] = []
): Promise<LookupResult[]> {
  const totalStartedAt = Date.now();
  try {
    // 1. Normalize input (lowercase for case-insensitive matching)
    const normalizedSymptoms = reportedSymptoms.map((s) => String(s).toLowerCase());
    const normalizedSigns = reportedSigns.map((s) => String(s).toLowerCase());
    const normalizedCharacteristics = reportedCharacteristics.map((c) =>
      String(c).toLowerCase()
    );
    const normalizedMoldNames = reportedMoldNames.map((n) => String(n).toLowerCase());

    const totalReported =
      normalizedSymptoms.length +
      normalizedSigns.length +
      normalizedCharacteristics.length +
      normalizedMoldNames.length;

    const inputStats = `symptoms: ${normalizedSymptoms.length}, 
      signs: ${normalizedSigns.length}, 
      characteristics: ${normalizedCharacteristics.length}, 
      moldNames: ${normalizedMoldNames.length}`;
    console.log(`[performMoldLookup] Input: ${inputStats} (total: ${totalReported})`);
    devLog(`[performMoldLookup] Input: ${inputStats} (total: ${totalReported})`);

    if (totalReported === 0) {
      console.log("[performMoldLookup] ⚠️ No reported items provided");
      devLog("[performMoldLookup] ⚠️ No reported items provided");
      return [];
    }

    // 2. Fetch slim catalog from Redis/Firestore
    const molds = await getLookupCatalog();
    if (molds.length === 0) {
      console.log("[performMoldLookup] ⚠️ No active molds found in database");
      devLog("[performMoldLookup] ⚠️ No active molds found in database");
      return [];
    }

    // Log first mold for debugging
    console.log(`[performMoldLookup] First mold: ${molds[0]?.moldName || "N/A"} with ${(molds[0]?.symptoms || []).length} symptoms`);
    devLog(`[performMoldLookup] First mold: ${molds[0]?.moldName || "N/A"} with ${(molds[0]?.symptoms || []).length} symptoms`);

    // 3. Score each mold
    const results = molds.map((mold) => {
      // Count matches
      let matches = 0;
      matches += normalizedSymptoms.filter((s) => mold.symptomLookup[s]).length;
      matches += normalizedSigns.filter((s) => mold.signLookup[s]).length;
      matches += normalizedCharacteristics.filter((c) => mold.characteristicLookup[c]).length;

      const moldNameNormalized = mold.moldNameNormalized;
      let nameMatches = 0;

      normalizedMoldNames.forEach((reportedName) => {
        if (!reportedName.trim().length) return;
        if (reportedName === moldNameNormalized) {
          nameMatches += 1;
        } else if (
          moldNameNormalized.includes(reportedName) ||
          reportedName.includes(moldNameNormalized)
        ) {
          nameMatches += 1;
        }
      });

      matches += nameMatches;

      const confidence = totalReported > 0 ? Math.round((matches / totalReported) * 100) : 0;

      return {
        moldId: mold.moldId,
        moldName: mold.moldName,
        confidence: Math.max(0, confidence), // ensure non-negative
      };
    });

    // 4. Filter and sort (only keep > 0% confidence)
    const filtered = results.filter((r) => r.confidence > 0);
    const sorted = filtered.sort((a, b) => b.confidence - a.confidence);

    const scoringDurationMs = Date.now() - scoringStartedAt;
    const totalDurationMs = Date.now() - totalStartedAt;

    console.log(`[performMoldLookup] ✅ Found ${sorted.length} matches from ${molds.length} molds`);
    devLog(
      `[performMoldLookup] ✅ Found ${sorted.length} matches from ${molds.length} molds`
    );
    console.log(
      `[performMoldLookup] Timing: fetch=${fetchDurationMs}ms scoring=${scoringDurationMs}ms total=${totalDurationMs}ms`
    );
    devLog(
      `[performMoldLookup] Timing: fetch=${fetchDurationMs}ms scoring=${scoringDurationMs}ms total=${totalDurationMs}ms`
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
