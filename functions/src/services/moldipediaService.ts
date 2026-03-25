import {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  WriteResult,
} from "firebase-admin/firestore";
import {documentToJson, queryToJson} from "../lib/firestore";
import {devLog} from "../utils/dev";
import {
  addMoldipedia,
  deleteMoldipedia,
  findAllMoldipedia,
  findArchivedMoldipedia,
  findMoldipediaById,
  softDeleteMoldipedia,
  updateMoldipedia,
} from "../repositories/moldipediaRepository";
import {
  Moldipedia,
  MoldipediaResponse,
  WithMetadata,
  WithId,
  PaginatedResult,
} from "../types/types";
import {transformToSignedUrl} from "../utils/storageTransform";
import {normalizeResponseTimestamps} from "../utils/normalizeResponse";
import {retrieveUserById} from "./userService";
import {getAuthUsersByIds} from "../lib/auth";

export const addMoldipediaToFirestore = async (
  details: Moldipedia
): Promise<WithId<Moldipedia> | null> => {
  try {
    // Filter out empty findings before saving
    const cleanedDetails = {
      ...details,
      ...(details.findings && {
        findings: details.findings.filter(
          (f: any) => f.title?.trim() && f.content?.trim()
        ),
      }),
    };

    const detailsWithMetadata: WithMetadata<Moldipedia> = {
      ...cleanedDetails,
      is_archived: false,
      metadata: {
        created_at: Timestamp.now(),
        updated_at: null,
        deleted_at: null,
      },
    };
    const doc: DocumentSnapshot | null =
      await addMoldipedia(detailsWithMetadata);
    if (!doc) throw new Error("Cannot add moldipedia.");
    return normalizeResponseTimestamps(documentToJson<WithId<Moldipedia>>(doc));
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveAllMoldipedia = async (
  limit: number,
  token?: string,
  searchQuery?: string
): Promise<PaginatedResult<MoldipediaResponse[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null = await findAllMoldipedia(
      limit,
      token
    );
    if (!docs) throw new Error("No moldipedia entries found.");
    let items = queryToJson<Moldipedia>(docs.snapshot);

    // Filter by search query if provided
    if (searchQuery && searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      items = items.filter((item) => {
        const title = (item as any).title?.toLowerCase() || "";
        const body = (item as any).body?.toLowerCase() || "";
        return title.includes(queryLower) || body.includes(queryLower);
      });
    }

    // Batch-fetch all unique authors upfront instead of N+1 per item
    const uniqueAuthorIds = [...new Set(items.map((i) => i.author_id).filter(Boolean))] as string[];
    const authorsMap = await getAuthUsersByIds(uniqueAuthorIds);

    // Transform cover_photo paths to signed URLs and resolve author names from pre-fetched data
    const itemsWithSignedUrls = await Promise.all(
      items.map(async (item) => {
        let authorName = "Unknown Author";
        if (item.author_id) {
          const user = authorsMap.get(item.author_id);
          if (user) {
            authorName =
              user.details.displayName ||
              `${user.user.first_name} ${user.user.last_name}`;
          }
        }

        // eslint-disable-next-line camelcase
        const {author_id: _, ...rest} = item;

        return normalizeResponseTimestamps({
          ...rest,
          cover_photo:
            (await transformToSignedUrl(item.cover_photo)) || item.cover_photo,
          author: authorName,
        });
      })
    );

    return {
      snapshot: itemsWithSignedUrls,
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveMoldipediaById = async (
  id: string
): Promise<MoldipediaResponse | null> => {
  try {
    const query: DocumentSnapshot | null = await findMoldipediaById(id);
    if (!query) throw new Error("No moldipedia found.");
    const moldipedia = documentToJson<Moldipedia>(query);

    // Transform cover_photo path to signed URL
    const signedUrl = await transformToSignedUrl(moldipedia.cover_photo);

    let authorName = "Unknown Author";
    if (moldipedia.author_id) {
      const user = await retrieveUserById(moldipedia.author_id);
      if (user) {
        authorName =
          user.details.displayName ||
          `${user.user.first_name} ${user.user.last_name}`;
      }
    }

    // eslint-disable-next-line camelcase
    const {author_id: _, ...rest} = moldipedia;

    return normalizeResponseTimestamps({
      ...rest,
      cover_photo: signedUrl || moldipedia.cover_photo,
      author: authorName,
    });
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const updateMoldipediaInFirestore = async (
  id: string,
  details: Partial<Moldipedia>
): Promise<MoldipediaResponse | null> => {
  try {
    // Filter out empty findings before saving
    const cleanedDetails = {
      ...details,
      ...(details.findings && {
        findings: details.findings.filter(
          (f: any) => f.title?.trim() && f.content?.trim()
        ),
      }),
    };

    const result: WriteResult | null = await updateMoldipedia(id, cleanedDetails);
    if (!result) throw new Error("Failed to update moldipedia.");
    const updated = await retrieveMoldipediaById(id);
    return updated;
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const softRemoveMoldipedia = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await softDeleteMoldipedia(id);
    if (!result) throw new Error("Failed to soft delete moldipedia");
  } catch (error) {
    devLog(error);
  }
};

export const archiveMoldipedia = async (
  id: string
): Promise<MoldipediaResponse | null> => {
  try {
    const result: WriteResult | null = await updateMoldipedia(id, {is_archived: true});
    if (!result) throw new Error("Failed to archive moldipedia.");
    return await retrieveMoldipediaById(id);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const unarchiveMoldipedia = async (
  id: string
): Promise<MoldipediaResponse | null> => {
  try {
    const result: WriteResult | null = await updateMoldipedia(id, {is_archived: false});
    if (!result) throw new Error("Failed to unarchive moldipedia.");
    return await retrieveMoldipediaById(id);
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const retrieveArchivedMoldipedia = async (
  limit: number,
  token?: string
): Promise<PaginatedResult<MoldipediaResponse[]> | null> => {
  try {
    const docs: PaginatedResult<QuerySnapshot> | null = await findArchivedMoldipedia(limit, token);
    if (!docs) throw new Error("No archived moldipedia entries found.");
    const items = queryToJson<Moldipedia>(docs.snapshot);

    // Batch-fetch all unique authors upfront instead of N+1 per item
    const uniqueAuthorIds = [...new Set(items.map((i) => i.author_id).filter(Boolean))] as string[];
    const authorsMap = await getAuthUsersByIds(uniqueAuthorIds);

    const itemsWithSignedUrls = await Promise.all(
      items.map(async (item) => {
        let authorName = "Unknown Author";
        if (item.author_id) {
          const user = authorsMap.get(item.author_id);
          if (user) {
            authorName =
              user.details.displayName ||
              `${user.user.first_name} ${user.user.last_name}`;
          }
        }
        // eslint-disable-next-line camelcase
        const {author_id: _, ...rest} = item;
        return normalizeResponseTimestamps({
          ...rest,
          cover_photo:
            (await transformToSignedUrl(item.cover_photo)) || item.cover_photo,
          author: authorName,
        });
      })
    );

    return {
      snapshot: itemsWithSignedUrls,
      nextPageToken: docs.nextPageToken,
    };
  } catch (error) {
    devLog(error);
    return null;
  }
};

export const removeMoldipedia = async (id: string): Promise<void> => {
  try {
    const result: WriteResult | null = await deleteMoldipedia(id);
    if (!result) throw new Error("Failed to delete moldipedia");
  } catch (error) {
    devLog(error);
  }
};
