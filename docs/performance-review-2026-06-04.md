# Performance Review — GitFlow Desktop
**Date:** 2026-06-04  
**Scope:** Full app render performance, state management, bundle, CSS animations

---

## Executive Summary

The app is generally well-architected with good use of Canvas rendering for the commit graph, Web Workers for layout computation, React Query for server state, and Zustand for client state. However, there are several **critical**, **high**, and **medium** severity performance issues that will cause unnecessary re-renders, memory pressure, and jank — especially in repos with many files or long histories.

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 3 | Re-render storms, memory |
| 🟠 High | 5 | Unnecessary re-renders, bundle |
| 🟡 Medium | 6 | Minor leaks, CSS, code quality |
| 🟢 Low | 3 | Micro-optimizations |

---

## 🔴 Critical Issues

### C1: `BottomBar` re-renders on EVERY query fetch/mutation globally

**File:** [`BottomBar.tsx`](apps/desktop/src/components/layout/BottomBar.tsx:21)

```tsx
const isFetching = useIsFetching({ predicate: ... });
const isMutating = useIsMutating();
```

**Problem:** [`useIsFetching()`](apps/desktop/src/components/layout/BottomBar.tsx:21) and [`useIsMutating()`](apps/desktop/src/components/layout/BottomBar.tsx:32) cause the entire `BottomBar` to re-render on **every** React Query state change globally — including progress updates from the commit graph infinite loading, diff fetches, status polls, etc. This is a 26px bar that re-renders dozens of times per minute.

**Impact:** The `BottomBar` also renders [`GitPet`](apps/desktop/src/components/layout/BottomBar.tsx:56) which has CSS animations running. Each re-render causes React reconciliation overhead and potential animation jank.

**Fix:** Extract the loading indicator into a tiny isolated component that only subscribes to `useIsFetching`/`useIsMutating`, and wrap the rest of `BottomBar` with `React.memo` or split into sub-components.

---

### C2: `usePetState` hook creates cascading re-renders via `useIsFetching` + `useIsMutating` + `useOperationsStore`

**File:** [`usePetState.ts`](apps/desktop/src/components/features/git-pet/usePetState.ts:41)

```tsx
const isFetching = useIsFetching({ predicate: ... });
const isMutating = useIsMutating();
const lastOperation = useOperationsStore((s) =>
  s.operations.find((op) => op.status === "completed" || op.status === "failed"),
);
```

**Problem:** This hook runs inside [`BottomBar → GitPet`](apps/desktop/src/components/layout/BottomBar.tsx:56) and subscribes to:
1. **Every** React Query fetch state change (filtered but still fires on every cache update)
2. **Every** mutation state change
3. The operations store's `.find()` — which creates a new reference on every store update

The `.find()` selector on `operations` returns a **new object reference** every time any operation is added/updated, causing the pet to re-render even when the "last completed/failed" operation hasn't changed.

**Fix:**
- Use `useIsFetching` with a stable `queryKey` filter instead of a predicate function (predicate creates a new function reference each render).
- Replace the `.find()` selector with a more targeted selector or memoize the result.
- Consider using `React.memo` on the `GitPet` component.

---

### C3: `SettingsDialog` is 990 lines with ~40 `useState` hooks loaded eagerly

**File:** [`SettingsDialog.tsx`](apps/desktop/src/components/features/dialogs/SettingsDialog.tsx:131)

**Problem:** The `SettingsDialog` component has **~40 `useState` hooks** and reads from localStorage on every mount. While it's conditionally rendered (only when `activeDialog === "settings"`), the component is imported eagerly in [`MainLayout.tsx`](apps/desktop/src/layouts/MainLayout.tsx:18):

```tsx
import { SearchDialog, KeyboardShortcutsModal, CherryPickDialog, SettingsDialog, ... } from "@/components/features/dialogs";
```

This means the entire `SettingsDialog` (plus all its tab sub-components) is included in the **main bundle** even when the user never opens settings.

**Fix:** Use `React.lazy()` for `SettingsDialog` and all dialog components that are only shown on user action.

---

## 🟠 High Issues

### H1: `MainLayout` has 10+ store selectors causing wide re-render surface

**File:** [`MainLayout.tsx`](apps/desktop/src/layouts/MainLayout.tsx:23)

```tsx
const sidebarOpen = useUIStore((s) => s.sidebarOpen);
const toggleSidebar = useUIStore((s) => s.toggleSidebar);
const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
const activeDialog = useUIStore((s) => s.activeDialog);
const closeDialog = useUIStore((s) => s.closeDialog);
const selectedCommit = useUIStore((s) => s.selectedCommit);
const mergeTargetBranch = useUIStore((s) => s.mergeTargetBranch);
const compareBranchTarget = useUIStore((s) => s.compareBranchTarget);
const repoPath = useRepoStore((s) => s.repoPath);
const selectedRef = useRepoStore((s) => s.selectedRef);
const openRepo = useRepoStore((s) => s.openRepo);
const closeRepo = useRepoStore((s) => s.closeRepo);
const toggleTheme = useRepoStore((s) => s.toggleTheme);
const openDialogState = useUIStore((s) => s.openDialog);
```

**Problem:** `MainLayout` subscribes to **15 store selectors** across two stores. Every time `selectedCommit` changes (which happens on every click in the graph), the entire layout re-renders — including the dialog overlay computation, `WelcomeScreen`, keyboard handler setup, and all `useEffect` hooks.

**Impact:** The `dialogComponents` object (line 338-366) is **recreated on every render**, creating new JSX elements for all possible dialogs even when no dialog is open.

**Fix:**
- Memoize the `dialogComponents` map with `useMemo`.
- Move dialog rendering into a separate component that only subscribes to `activeDialog`.
- Use Zustand's shallow comparison or split into smaller components.

---

### H2: `WorkingTree` is a 1070-line mega-component with 25+ state variables

**File:** [`WorkingTree.tsx`](apps/desktop/src/components/features/working-tree/WorkingTree.tsx:32)

**Problem:** `WorkingTree` has **25+ `useState` hooks**, multiple `useEffect` hooks, and handles staging, committing, AI review, batch operations, context menus, and more — all in a single component. Every state change (e.g., toggling a checkbox, typing in commit message) triggers re-render of the entire 1070-line component tree.

**Specific re-render triggers:**
- [`commitMessage`](apps/desktop/src/components/features/working-tree/WorkingTree.tsx:42) state triggers `runLint` on every keystroke via [`useEffect`](apps/desktop/src/components/features/working-tree/WorkingTree.tsx:54)
- [`selectedFiles`](apps/desktop/src/components/features/working-tree/WorkingTree.tsx:81) Set creates new reference on every toggle
- The [`handleFileClick`](apps/desktop/src/components/features/working-tree/WorkingTree.tsx:204) creates a new `currentList` array on every click

**Fix:** Split into sub-components: `CommitForm`, `StagedFileList`, `UnstagedFileList`, `AIReviewPanel`, `ScopeSuggestion`. Use `React.memo` on file list items.

---

### H3: `Sidebar` re-renders on every branch/tag/submodule data change

**File:** [`Sidebar.tsx`](apps/desktop/src/components/features/sidebar/Sidebar.tsx:43)

```tsx
const { data: branches } = useGitBranches(repoPath);
const { data: tags } = useTagList(repoPath);
const { data: submodules } = useSubmoduleList(repoPath);
const { data: syncStatus } = useGitSyncStatus(repoPath);
```

**Problem:** The `Sidebar` component subscribes to **4 different queries** at the top level. When any of these data sources update (e.g., sync status polls every 10 minutes, file watcher triggers branch refresh), the **entire sidebar** re-renders — including the branch tree, tag list, submodule list, recent repos dropdown, and all the memoized `BranchTreeRenderer` components.

The `localBranches` and `remoteBranches` arrays (lines 77-78) are **recomputed on every render** without memoization:
```tsx
const localBranches = branches?.filter((b) => !b.remote) || [];
const remoteBranches = branches?.filter((b) => b.remote) || [];
```

**Fix:**
- Wrap `localBranches`/`remoteBranches` in `useMemo`.
- Split sidebar into isolated sub-sections (`BranchSection`, `TagSection`, `RemoteSection`) each subscribing to only their own data.

---

### H4: No Vite bundle splitting configuration

**File:** [`vite.config.ts`](apps/desktop/vite.config.ts:1)

**Problem:** The Vite config has **zero `build.rollupOptions`** configuration. There's no manual chunk splitting, which means:
- All dialog components are in the main chunk
- All query hooks are in the main chunk  
- The `pet-definitions.tsx` file (1180 lines of SVG definitions) is in the main chunk
- React Query, Zustand, Lucide icons, and all dependencies are in a single vendor chunk

**Fix:** Add chunk splitting strategy:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-query': ['@tanstack/react-query', '@tanstack/react-virtual'],
        'vendor-ui': ['lucide-react', 'sonner'],
      },
    },
  },
},
```

---

### H5: `pet-definitions.tsx` is 1180 lines of JSX rendered eagerly

**File:** [`pet-definitions.tsx`](apps/desktop/src/components/features/git-pet/pet-definitions.tsx:1)

**Problem:** This file contains **14 pet definitions** each with complex SVG body/face/accessory JSX. The [`getPetDefinition()`](apps/desktop/src/components/features/git-pet/pet-definitions.tsx:27) function is called on every render of `GitPetSprite`, returning a new object with `body`, `face`, `mouth`, `accessories` as `React.ReactNode`. Since these are JSX elements, they are **recreated on every render** — React must reconcile all SVG paths each time.

**Fix:**
- Memoize each pet definition as a module-level constant (they're static).
- Consider using `React.memo` on the SVG body components.
- The `body`, `face`, `mouth`, `accessories` should be memoized components, not inline JSX.

---

## 🟡 Medium Issues

### M1: `useCanvasRenderer` calls `getComputedStyle(document.body)` on every render

**File:** [`useCanvasRenderer.ts`](apps/desktop/src/components/features/graph/useCanvasRenderer.ts:314)

```tsx
const styles = getComputedStyle(document.body);
const surface0 = styles.getPropertyValue("--surface-0").trim() || "#1c1c1e";
const textPrimary = styles.getPropertyValue("--text-primary").trim() || "#e5e5e5";
const textSecondary = styles.getPropertyValue("--text-secondary").trim() || "#a1a1a6";
```

**Problem:** `getComputedStyle()` forces a **style recalculation** and is called inside the main `useEffect` that runs on every scroll, resize, or data change. This is a synchronous layout-triggering call.

**Fix:** Cache the CSS custom property values and only re-read them when `theme` changes (which is already a dependency).

---

### M2: `formatCommitDate()` creates a new `Date` object for every visible commit on every frame

**File:** [`useCanvasRenderer.ts`](apps/desktop/src/components/features/graph/useCanvasRenderer.ts:576)

**Problem:** Inside the canvas render loop, `formatCommitDate()` is called for every visible commit (~20-30 rows). Each call does regex replacement + `new Date()` + `toLocaleDateString()`. While individual calls are fast, this runs on **every canvas frame** (scroll, hover, selection change).

**Fix:** Cache formatted dates in the layout data or use a `Map<string, string>` cache.

---

### M3: `useOperationObserver` creates new selector references on every mutation state change

**File:** [`useOperationObserver.ts`](apps/desktop/src/hooks/useOperationObserver.ts:17)

```tsx
const allStates = useMutationState({
  filters: {},
  select: (mutation: any) => { ... },
});
```

**Problem:** The `select` function is recreated on every render, and `filters: {}` is a new object each time. This causes `useMutationState` to re-subscribe frequently.

**Fix:** Memoize the `select` function and `filters` object with `useMemo`/`useCallback`.

---

### M4: `WorkingTree` keyboard handler has stale closure risk

**File:** [`WorkingTree.tsx`](apps/desktop/src/components/features/working-tree/WorkingTree.tsx:509)

```tsx
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && commitMessage.trim()) {
      handleCommit();
    }
  };
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [commitMessage, repoPath]);
```

**Problem:** The dependency array includes `commitMessage` and `repoPath`, but `handleCommit` is **not** in the deps. This means `handleCommit` captures a stale closure over `staged`, `unstaged`, `amend`, etc. The effect re-subscribes on every keystroke (since `commitMessage` changes), creating unnecessary listener churn.

**Fix:** Use `useCallback` for `handleCommit` and include it in deps, or use a ref pattern.

---

### M5: Pet CSS animations use `will-change` on permanently animated elements

**File:** [`pet-sprites.css`](apps/desktop/src/components/features/git-pet/pet-sprites.css:166)

```css
.pet-idle {
  animation: pet-idle-bob 2.5s ease-in-out infinite;
  will-change: transform;
}
.pet-sleep {
  animation: pet-sleep-breathe 3s ease-in-out infinite;
  will-change: transform, opacity;
}
```

**Problem:** `will-change` is set on elements that are **always animating**. The browser already promotes animated elements to their own compositor layer when animations are running. Keeping `will-change` permanently reserves GPU memory unnecessarily.

**Fix:** Remove `will-change` from CSS — the `animation` property already triggers compositor layer promotion. Only use `will-change` for elements that are about to animate (via JS class toggle).

---

### M6: `BottomBar` renders `runningOps` filter on every render

**File:** [`BottomBar.tsx`](apps/desktop/src/components/layout/BottomBar.tsx:16)

```tsx
const runningOps = useOperationsStore((s) => s.operations.filter((o) => o.status === "running").length);
```

**Problem:** The `.filter().length` creates a new array and number on every store update. While Zustand uses `Object.is` for equality, the `filter` runs on every render regardless.

**Fix:** Compute `runningOps` count in the store or use a derived selector with `shallow` comparison.

---

## 🟢 Low Issues

### L1: `CommitGraph` loading skeleton renders 20 animated divs

**File:** [`CommitGraph.tsx`](apps/desktop/src/components/features/graph/CommitGraph.tsx:241)

```tsx
{Array.from({ length: 20 }).map((_, i) => (
  <div key={i} className="...animate-pulse..." />
))}
```

**Impact:** 20 `animate-pulse` elements during loading. Minor but could be reduced to 10-12 for the same visual effect.

---

### L2: `Sidebar` recent repos filter runs twice

**File:** [`Sidebar.tsx`](apps/desktop/src/components/features/sidebar/Sidebar.tsx:228-271)

The same filter logic (`.filter(path => path !== repoPath).filter(path => name.toLowerCase().includes(...))`) is duplicated — once for rendering the list and once for the "No repositories found" empty state check.

**Fix:** Compute the filtered list once with `useMemo`.

---

### L3: `CommitGraph` `ctxItems` array is recreated on every render

**File:** [`CommitGraph.tsx`](apps/desktop/src/components/features/graph/CommitGraph.tsx:262)

```tsx
const ctxItems: ContextMenuItem[] = ctxMenu ? [...] : [];
```

**Impact:** Minor — only matters when context menu is open. But the JSX icons (`<CopyIcon />`, etc.) are recreated.

---

## ✅ What's Done Well

| Area | Assessment |
|------|-----------|
| **Canvas rendering** | Commit graph uses Canvas + Web Workers — excellent for large repos |
| **Virtual scrolling** | `@tanstack/react-virtual` for commit list with proper overscan |
| **Lazy loading** | `LazyDiffViewer`, `LazyActivityHeatmap` use `React.lazy()` |
| **Query caching** | Good use of `staleTime`, `gcTime`, incremental log loading |
| **GitPet memo** | `GitPetSprite` and `GitPetBubble` wrapped in `React.memo` |
| **Debounced invalidation** | `scheduleInvalidate` in MainLayout prevents query storms |
| **Performance instrumentation** | `performance.ts` with `measureAsync`, milestone tracking |
| **ResizeObserver** | CommitGraph uses ResizeObserver with RAF debouncing |

---

## Priority Action Plan

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | C1: Isolate `BottomBar` loading indicator | Low | High — stops re-render storm |
| 2 | C2: Fix `usePetState` selector stability | Low | High — stops pet re-render storm |
| 3 | H1: Memoize `MainLayout` dialog map | Low | Medium — reduces layout re-renders |
| 4 | H4: Add Vite chunk splitting | Low | Medium — smaller initial bundle |
| 5 | C3: Lazy-load `SettingsDialog` | Low | Medium — smaller main bundle |
| 6 | H3: Memoize Sidebar computed values | Low | Medium — fewer sidebar re-renders |
| 7 | H2: Split `WorkingTree` into sub-components | High | High — long-term maintainability |
| 8 | H5: Memoize pet definitions | Medium | Medium — fewer SVG reconciliations |
| 9 | M1: Cache `getComputedStyle` values | Low | Low — fewer style recalcs |
| 10 | M5: Remove unnecessary `will-change` | Low | Low — GPU memory savings |
