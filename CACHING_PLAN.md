# Caching Architecture Plan

## Current State: Mold Report Caching (✅ Complete)

### Problem Solved
- **Dual-layer caching conflict**: Middleware cache (`cacheGet`) and service-layer cache (`getCachedList`) were using different resource names, causing synchronization bugs
- **Stale data on list updates**: When reports were created/updated, one cache layer would invalidate but the other wouldn't
- **Complexity**: Two independent cache invalidation paths that had to stay in sync

### Solution Implemented
**Single-layer service-level caching with smart mutations:**

1. **Removed middleware-level caching** 
   - Deleted `cacheGet("mold-reports")` from GET / endpoint
   - No more route-level cache middleware for mold reports

2. **Unified service-layer caching**
   - Single resource namespace: `"mold-reports-all"`, `"mold-reports-user"`, `"mold-reports-unassigned"`, `"mold-reports-assigned"`
   - Service functions (`retrieveAllMoldReports`, `retrieveAllMoldReportsByUser`, etc.) handle all caching
   - Cache keys: `{resource}:list:{hash_of_query_params}`

3. **Smart cache mutations instead of full invalidation**
   - **CREATE**: `invalidateAllLists()` - clears first-page caches so fresh data appears
   - **UPDATE (membership change)**: `smartUpdateReportCacheOnMembership()` - removes from old lists, adds to new ones
   - **UPDATE (simple field change)**: `replaceCachedListItem()` - in-place update, no pagination impact
   - **DELETE**: `removeCachedListItem()` - removes item from all lists

4. **Cross-device sync via polling**
   - Website: 5-second polling interval on investigation page
   - Mobile: Direct cache invalidation on write, manual refresh for reads

### Key Files
- **Service layer**: `src/services/moldReportService.ts` - `createReportCache`, `smartUpdateReportCacheOnMembership`, `replaceReportCache`, `removeReportCache`
- **Cache manager**: `src/utils/cacheManager.ts` - `upsertCachedListItem`, `replaceCachedListItem`, `removeCachedListItem`, `invalidateAllLists`
- **Routes**: `src/routes/moldReportRoutes.ts` - No cache middleware, pure business logic
- **Logging**: `[SmartCache]` prefix in all cache operations for observability

---

## Standard to Apply to Other Features

### Architecture Principles

✅ **DO:**
- Cache at the **service layer**, not route/middleware layer
- Implement **smart mutations** (add/update/remove items) instead of bulk invalidation
- Use **consistent resource naming**: `{feature}:list:{hash}` and `{feature}:item:{id}`
- Add `[SmartCache]` logging to all cache operations
- Validate cache hits/misses with dev logs

❌ **DON'T:**
- Create middleware-level caching (route decorators with `cacheGet`, etc.)
- Have two independent cache layers fighting each other
- Invalidate entire cache when a single item changes
- Hide cache operations (always log for debugging)

### Implementation Checklist for New Features

When adding caching to a new feature (e.g., mold cases, users, notifications):

- [ ] **Define resource namespace**
  - List resource: `"{feature}:list:{hash}"`
  - Item resource: `"{feature}:item:{id}"`
  - Count resource: `"{feature}:count:{suffix?}"`
  - Example: `mold-cases-all`, `user-assigned`, `notification-unread`

- [ ] **Create service-layer retrieval functions**
  ```typescript
  export async function retrieve{Feature}(query?, options?) {
    const cached = await getCachedList(resource, query, options);
    if (cached) return cached;
    
    const result = await fetchFromDatabase();
    await cacheList(resource, result, query);
    return result;
  }
  ```

- [ ] **Implement mutation handlers** (in service layer, NOT routes)
  ```typescript
  const create{Feature}Cache = async (item) => {
    // For creates: invalidate first-page lists
    await invalidateAllLists(resource);
  };
  
  const replace{Feature}Cache = async (item) => {
    // For simple updates: in-place replace
    await replaceCachedListItem(resource, item.id, item);
  };
  
  const smartUpdate{Feature}Cache = async (oldItem, newItem) => {
    // For membership changes: remove from old, add to new
    await removeCachedListItem(resource, oldItem.id);
    await upsertCachedListItem(resource, newItem);
  };
  
  const remove{Feature}Cache = async (id) => {
    // For deletes: remove from all lists
    await removeCachedListItem(resource, id);
  };
  ```

- [ ] **Call mutation handlers from CRUD operations**
  ```typescript
  export async function update{Feature}(id, changes) {
    const oldItem = await get(id);
    const updated = await database.update(id, changes);
    
    // Decide which mutation strategy
    if (membershipChanged(oldItem, updated)) {
      await smartUpdate{Feature}Cache(oldItem, updated);
    } else {
      await replace{Feature}Cache(updated);
    }
    
    return updated;
  }
  ```

- [ ] **Add `[SmartCache]` logging**
  - All cache reads: `[SmartCache] HIT/MISS {key}`
  - All cache writes: `[SmartCache] WRITE {key}`
  - All cache deletes: `[SmartCache] DEL {key}`
  - All SCAN operations: `[SmartCache] Redis SCAN: pattern={pattern} found={count}`

- [ ] **Test cache behavior**
  - Create item → appears in cached list within 5s
  - Update item → list updates without full invalidation
  - Delete item → removed from all cached lists
  - Manual refresh → gets fresh data

---

## Features Candidates for Refactor

### High Priority (Used frequently, benefit most from smart caching)
1. **Users** - role-based caching, assignment changes
2. **Notifications** - unread counts, mark-as-read updates
3. **Mold Cases** - priority changes, status updates
4. **Flag Reports** - status changes, resolution updates

### Medium Priority
5. **Dashboard Summaries** - count caching with smart increments
6. **Search Results** - query result caching with invalidation on create/update

### Low Priority
7. **FAQ** - rarely changes, simple invalidation on update
8. **System Requests** - low-volume, less critical

---

## Benefits of This Approach

| Issue | Single-Layer Service Caching | Dual-Layer Middleware+Service |
|-------|-----|-----|
| **Complexity** | Low - one place to manage | High - two independent paths |
| **Sync bugs** | None - single source of truth | High - layers get out of sync |
| **Performance at scale** | Excellent - smart mutations | Poor - full invalidation for every change |
| **Scalability** | ✅ Handles 5k+ records | ❌ Breaks down with bulk operations |
| **Debugging** | Easy - trace through service layer | Hard - hunt between middleware and service |
| **Observability** | Clear - [SmartCache] logs | Messy - logs scattered across two layers |

---

## Rollout Timeline

**Phase 1 (Done):** 
- ✅ Mold Reports - validate approach works end-to-end

**Phase 2 (Next):**
- [ ] Users - apply same pattern
- [ ] Notifications - add unread count smart increments

**Phase 3:**
- [ ] Mold Cases, Flag Reports
- [ ] Dashboard Summaries

**Phase 4:**
- [ ] Remaining features
- [ ] Remove any remaining middleware caching patterns

---

## Notes

- **Cache TTL**: Default 300s (5 minutes), aligned with website polling interval
- **Redis SCAN**: Used to find matching keys for pattern-based invalidation; works well up to 5k+ cached lists
- **Pino logging**: Configure with `[SmartCache]` prefix for easy filtering (`grep '[SmartCache]'`)
- **Testing**: Always test cross-device sync - create on mobile, check website within 5s polling window
