# Firestore Signal Cache Invalidation - Mold Reports Implementation

## Phase 1: Backend Setup ✅

### Step 1.1: Add Signal Update Helper
**File:** `src/services/moldReportService.ts` (top of file, after imports)

```typescript
const updateMoldReportsCacheSignal = async (): Promise<void> => {
  try {
    await admin.firestore()
      .doc('cache_signals/mold-reports')
      .set({
        last_update: admin.firestore.FieldValue.serverTimestamp(),
        version: admin.firestore.FieldValue.increment(1),
      }, { merge: true });
    devLog('[SmartCache] Updated Firestore signal for mold-reports');
  } catch (err) {
    devLog(`[SmartCache] Error updating signal: ${err}`);
  }
};
```

**Location:** Add after the cache mutation helper functions (after `removeReportCache`)

**Verify:** ✅ Code compiles without errors

---

### Step 1.2: Call Signal on Report Create
**File:** `src/services/moldReportService.ts`

Find this line in `createMoldReport()` function (around line 900):
```typescript
await createReportCache(createdReport);
```

Add after it:
```typescript
await updateMoldReportsCacheSignal();
```

**Full context should look like:**
```typescript
const createdReport = await addMoldReport({...});
await createReportCache(createdReport);
await updateMoldReportsCacheSignal(); // ← ADD THIS
return createdReport;
```

**Verify:** ✅ Function still compiles

---

### Step 1.3: Call Signal on Report Update
**File:** `src/services/moldReportService.ts`

Find `updateMoldReportInFirestore()` function. At the end, before the final return statement, add:

```typescript
// After all cache mutations are done
await updateMoldReportsCacheSignal();
```

**Location:** Should be after the cache mutation logic (around line 1380)

**Full example:**
```typescript
if (reportUpdateAffectsMembership(updates)) {
  await smartUpdateReportCacheOnMembership(reportId, updatedReport);
} else {
  await replaceReportCache(updatedReport);
}
await updateMoldReportsCacheSignal(); // ← ADD THIS
return updatedReport;
```

**Verify:** ✅ Function still compiles

---

### Step 1.4: Call Signal on Report Delete
**File:** `src/services/moldReportService.ts`

Find `deleteMoldReport()` and `softDeleteMoldReport()` functions.

In each, add at the end (before final return):
```typescript
await updateMoldReportsCacheSignal();
```

**Example for deleteMoldReport:**
```typescript
const result = await deleteMoldReportRepo(reportId);
await removeReportCache(reportId);
await updateMoldReportsCacheSignal(); // ← ADD THIS
return result;
```

**Verify:** ✅ Both functions compile

---

### Step 1.5: Deploy Backend
```bash
cd e:\thesis\api\functions
npm run deploy
```

**Verify:** 
- ✅ Deploy succeeds
- ✅ No errors in Cloud Functions logs
- ✅ Signal document appears in Firestore console under `cache_signals/mold-reports`

---

## Phase 2: Frontend Setup ✅

### Step 2.1: Add Firestore Imports
**File:** `src/app/investigation/page.tsx`

Add to imports at top (around line 1-20):
```typescript
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
```

**Verify:** ✅ No import errors

---

### Step 2.2: Remove Polling Interval
**File:** `src/app/investigation/page.tsx`

Find the `useSWRInfinite` call (around line 45-65). 

**Old code:**
```typescript
const {
  data: casePagesData,
  size,
  setSize,
  isValidating: isLoadingMore,
  isLoading: casesLoading,
} = useSWRInfinite<ApiResponse<PaginatedResponse<MoldReportSnapshot>>>(
  (pageIndex, prev) => {
    // ... fetch logic
  },
  {
    revalidateFirstPage: true,
    revalidateOnFocus: true,
    revalidateIfStale: true,
    refreshInterval: 5000, // ← REMOVE THIS LINE
  },
);
```

**New code:**
```typescript
const {
  data: casePagesData,
  size,
  setSize,
  isValidating: isLoadingMore,
  isLoading: casesLoading,
  mutate, // ← ADD THIS
} = useSWRInfinite<ApiResponse<PaginatedResponse<MoldReportSnapshot>>>(
  (pageIndex, prev) => {
    // ... fetch logic
  },
  {
    revalidateFirstPage: true,
    revalidateOnFocus: true,
    revalidateIfStale: true,
    // ✅ refreshInterval REMOVED
  },
);
```

**Verify:** ✅ No TypeScript errors, `mutate` is available

---

### Step 2.3: Add Firestore Signal Listener
**File:** `src/app/investigation/page.tsx`

Find the existing `useEffect` that calls `globalMutate` (around line 69-74).

Add a NEW `useEffect` after it:

```typescript
// Listen to Firestore cache signal for real-time updates
useEffect(() => {
  if (!authUser?.user?.id) return;

  const db = getFirestore();
  const signalRef = doc(db, 'cache_signals', 'mold-reports');

  const unsubscribe = onSnapshot(signalRef, (snapshot) => {
    if (snapshot.exists()) {
      devLog('[SmartCache] Firestore signal received, refreshing mold-reports list');
      mutate(); // Trigger SWR refresh
    }
  });

  return () => unsubscribe();
}, [authUser?.user?.id, mutate]);
```

**Location:** Should be right after the existing globalMutate useEffect (around line 75)

**Full example of both useEffects:**
```typescript
// Mount refresh
useEffect(() => {
  globalMutate((key: unknown) => {
    return typeof key === 'string' && key.includes('/api/v1/mold-reports');
  }, undefined, { revalidate: true });
}, [globalMutate]);

// ← NEW EFFECT GOES HERE
useEffect(() => {
  if (!authUser?.user?.id) return;

  const db = getFirestore();
  const signalRef = doc(db, 'cache_signals', 'mold-reports');

  const unsubscribe = onSnapshot(signalRef, (snapshot) => {
    if (snapshot.exists()) {
      devLog('[SmartCache] Firestore signal received, refreshing mold-reports list');
      mutate();
    }
  });

  return () => unsubscribe();
}, [authUser?.user?.id, mutate]);
```

**Verify:** ✅ No TypeScript errors

---

### Step 2.4: Build & Test Frontend
```bash
cd e:\thesis\website
npm run build
npm run dev
```

**Verify:** 
- ✅ Build succeeds
- ✅ No console errors
- ✅ Page loads without errors

---

## Phase 3: Integration Testing ✅

### Test 1: Create Report Cross-Device
**Steps:**
1. Open website investigation page in Chrome
2. Open mobile app on different device
3. On mobile: Create a new mold report
4. On website: Watch the logs in Chrome DevTools (F12 → Console)

**Expected:**
- ✅ Within 1-2 seconds, see `[SmartCache] Firestore signal received` log
- ✅ List automatically updates with the new report
- ✅ NO 5-second delay

**Verify:** ✅ Works as expected

---

### Test 2: Update Report Status
**Steps:**
1. Keep website investigation page open
2. On mobile or another browser: Assign a report
3. Watch website list

**Expected:**
- ✅ Within 1-2 seconds, assigned report appears in the list
- ✅ Console shows signal received

**Verify:** ✅ Works as expected

---

### Test 3: Delete Report
**Steps:**
1. Keep website open
2. Delete a report from mobile/backend
3. Watch website list

**Expected:**
- ✅ Within 1-2 seconds, report disappears from list
- ✅ Console shows signal received

**Verify:** ✅ Works as expected

---

### Test 4: Idle Tab (No Wasted Resources)
**Steps:**
1. Open investigation page on website
2. Leave it idle for 5 minutes
3. Check network tab (DevTools → Network)
4. Watch for polling requests

**Expected:**
- ✅ NO repeated API calls to `/api/v1/mold-reports`
- ✅ Only ONE WebSocket connection to Firestore (stays open, quiet)
- ✅ No new HTTP requests while idle

**Verify:** ✅ No polling waste

---

### Test 5: Firebase Console Verification
**Steps:**
1. Go to Firebase Console → Firestore
2. Navigate to `cache_signals` collection
3. Look for `mold-reports` document

**Expected:**
- ✅ Document exists
- ✅ `last_update` field shows current timestamp
- ✅ `version` field increments on each change (1, 2, 3, etc.)

**Verify:** ✅ Signal document is updating

---

## Phase 4: Cleanup & Optimization ✅

### Step 4.1: Remove Old Polling References
**File:** Check for any leftover polling code

Search codebase for:
```bash
grep -r "refreshInterval" src/
grep -r "5000" src/app/investigation/
```

Delete any:
- `refreshInterval: 5000`
- Comments about "polling every 5 seconds"

**Verify:** ✅ No polling references remain

---

### Step 4.2: Update Documentation
**File:** Update `CACHING_PLAN.md`

Add to "Current State: Mold Report Caching":
```markdown
✅ **Real-time sync via Firestore signals**
- Replaced polling with `onSnapshot` listener
- Backend writes to `cache_signals/mold-reports` on every change
- Frontend listens and refreshes immediately
- Zero cost when idle
- Sub-second latency
```

**Verify:** ✅ Documentation updated

---

## Summary Checklist

### Backend
- [ ] Added `updateMoldReportsCacheSignal()` helper
- [ ] Called in `createMoldReport()`
- [ ] Called in `updateMoldReportInFirestore()`
- [ ] Called in `deleteMoldReport()`
- [ ] Called in `softDeleteMoldReport()`
- [ ] Deployed to Firebase Functions
- [ ] Verified signal document in Firestore

### Frontend
- [ ] Added Firestore imports
- [ ] Removed `refreshInterval: 5000`
- [ ] Added `mutate` to SWR destructuring
- [ ] Added `onSnapshot` listener useEffect
- [ ] Built and tested locally
- [ ] No console errors

### Testing
- [ ] Test 1: Cross-device create ✅
- [ ] Test 2: Cross-device update ✅
- [ ] Test 3: Cross-device delete ✅
- [ ] Test 4: Idle tab (no waste) ✅
- [ ] Test 5: Firestore console verification ✅

### Cleanup
- [ ] Removed old polling references
- [ ] Updated documentation
- [ ] Ready for production

---

## Rollback (If Needed)

If anything breaks:
1. Restore `refreshInterval: 5000` to SWR config
2. Remove the `onSnapshot` listener useEffect
3. Remove signal writes from backend functions
4. Deploy

The polling will resume immediately.

---

## Success Criteria

✅ **You'll know it worked when:**
- Creating a report on mobile appears on website within 1 second
- No console polling requests when idle
- Firebase Console shows `cache_signals/mold-reports` document updating
- All tests pass
- Idle tabs don't waste API quota
