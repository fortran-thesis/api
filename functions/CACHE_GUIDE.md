# Redis Cache Manager - Quick Reference Guide

## Overview

The cache manager provides a modular approach to Redis caching with automatic cache invalidation strategies for different HTTP methods.

## Cache Key Structure

```
{resource}:list:{query_hash}  → List/paginated results
{resource}:item:{id}          → Single item by ID
{resource}:count              → Count queries
```

## Import

```typescript
import {
  getCachedList,
  cacheList,
  getCachedItem,
  cacheItem,
  handlePostCache,
  handlePatchCache,
  handleDeleteCache,
} from "../utils/cacheManager";
```

## Usage Patterns

### 1. GET All (List/Paginated)

```typescript
export async function getAllItems(limit: number, token?: string) {
  const resource = "items";
  const query = {limit, token: token || "first"};
  
  // Check cache
  const cached = await getCachedList<Result>(resource, query);
  if (cached) return cached;
  
  // Fetch from DB
  const result = await fetchFromDatabase();
  
  // Store in cache (TTL: 300s = 5min)
  await cacheList(resource, result, query, {ttl: 300});
  
  return result;
}
```

### 2. GET By ID (Single Item)

```typescript
export async function getItemById(id: string) {
  const resource = "items";
  
  // Check cache
  const cached = await getCachedItem<Item>(resource, id);
  if (cached) return cached;
  
  // Fetch from DB
  const item = await fetchItemFromDatabase(id);
  
  // Store in cache
  await cacheItem(resource, id, item, {ttl: 300});
  
  return item;
}
```

### 3. POST (Create)

```typescript
export async function createItem(data: ItemData) {
  // Create in database
  const newItem = await createInDatabase(data);
  
  // Invalidate all list caches (new item affects lists)
  await handlePostCache("items");
  
  return newItem;
}
```

### 4. PATCH (Update)

```typescript
export async function updateItem(id: string, data: Partial<Item>) {
  // Update in database
  await updateInDatabase(id, data);
  
  // Scenario A: Simple update (e.g., updating description)
  // Only invalidates the specific item cache
  await handlePatchCache("items", id, false);
  
  // Scenario B: Update affects list ordering (e.g., updating name, date)
  // Invalidates item cache AND all list caches
  await handlePatchCache("items", id, true);
  
  return {success: true};
}
```

### 5. DELETE

```typescript
export async function deleteItem(id: string) {
  // Delete from database
  await deleteFromDatabase(id);
  
  // Invalidate item cache, all list caches, and count caches
  await handleDeleteCache("items", id);
  
  return {success: true};
}
```

## Recommended TTL Values

```typescript
// Frequently updated
{ttl: 300}   // 5 minutes - users, reports, cases

// Rarely updated
{ttl: 3600}  // 1 hour - static data, moldipedia

// Real-time data
{ttl: 60}    // 1 minute - active cases, pending requests

// Counts/stats
{ttl: 300}   // 5 minutes
```

## When to Invalidate Lists in PATCH

Invalidate lists (`handlePatchCache(resource, id, true)`) when updating:
- ✅ Sort fields (created_at, username, priority)
- ✅ Filter fields (role, status, is_active)
- ✅ Fields shown in list views

Don't invalidate lists when updating:
- ❌ Detail-only fields (description, notes)
- ❌ Internal metadata
- ❌ Fields not affecting list display

## Resource Naming

Use consistent kebab-case names:
- `users`
- `mold-reports`
- `mold-cases`
- `scanned-molds`
- `flag-reports`
- `system-requests`
- `moldipedia`

## Integration Steps

1. **Import the cache manager** in your service file
2. **Add cache checking** before database queries (GET operations)
3. **Add cache storing** after successful database fetches (GET operations)
4. **Add cache invalidation** after mutations (POST/PATCH/DELETE operations)
5. **Choose appropriate TTL** based on data update frequency
6. **Decide on list invalidation** for PATCH based on updated fields

## Complete Example

```typescript
import {
  getCachedList,
  cacheList,
  getCachedItem,
  cacheItem,
  handlePostCache,
  handlePatchCache,
  handleDeleteCache,
} from "../utils/cacheManager";

const RESOURCE = "users";
const TTL = 300; // 5 minutes

// GET ALL
export async function getAllUsers(limit: number, token?: string) {
  const query = {limit, token: token || "first"};
  const cached = await getCachedList<PaginatedResult>(RESOURCE, query);
  if (cached) return cached;
  
  const result = await findAllUsers(limit, token);
  await cacheList(RESOURCE, result, query, {ttl: TTL});
  return result;
}

// GET BY ID
export async function getUserById(id: string) {
  const cached = await getCachedItem<User>(RESOURCE, id);
  if (cached) return cached;
  
  const user = await findUserById(id);
  await cacheItem(RESOURCE, id, user, {ttl: TTL});
  return user;
}

// POST
export async function createUser(data: UserData) {
  const user = await createUserInDb(data);
  await handlePostCache(RESOURCE);
  return user;
}

// PATCH (affects list ordering - e.g., username change)
export async function updateUsername(id: string, username: string) {
  await updateUserInDb(id, {username});
  await handlePatchCache(RESOURCE, id, true); // true = invalidate lists
}

// PATCH (doesn't affect list - e.g., address change)
export async function updateAddress(id: string, address: string) {
  await updateUserInDb(id, {address});
  await handlePatchCache(RESOURCE, id, false); // false = keep lists cached
}

// DELETE
export async function deleteUser(id: string) {
  await deleteUserFromDb(id);
  await handleDeleteCache(RESOURCE, id);
}
```

## Notes

- Cache operations are wrapped in try-catch internally and won't crash your app
- Failed cache operations are logged but don't affect the main flow
- Each paginated page is cached separately for efficient memory usage
- Query parameters are hashed to create consistent cache keys
