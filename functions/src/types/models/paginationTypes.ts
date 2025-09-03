export type PaginatedResult<T> = {
  snapshot: T;
  nextPageToken: string | null;
}